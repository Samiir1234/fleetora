import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isWithinHargeisa, isWithinSomaliland } from "../../../lib/hargeisa-geo";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8_192;

function isAuthorized(request: Request, expectedToken: string) {
  const suppliedToken = request.headers.get("x-gps-token");
  if (!suppliedToken) return false;

  const expected = Buffer.from(expectedToken);
  const supplied = Buffer.from(suppliedToken);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function isGpsPayload(value: unknown): value is {
  plate_number: string;
  latitude: number;
  longitude: number;
  speed_kmh?: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;

  return typeof payload.plate_number === "string"
    && payload.plate_number.trim().length > 0
    && payload.plate_number.trim().length <= 100
    && typeof payload.latitude === "number"
    && Number.isFinite(payload.latitude)
    && payload.latitude >= -90
    && payload.latitude <= 90
    && typeof payload.longitude === "number"
    && Number.isFinite(payload.longitude)
    && payload.longitude >= -180
    && payload.longitude <= 180
    && (
      payload.speed_kmh === undefined
      || (
        typeof payload.speed_kmh === "number"
        && Number.isFinite(payload.speed_kmh)
        && payload.speed_kmh >= 0
        && payload.speed_kmh <= 500
      )
    );
}

export async function POST(request: Request) {
  const gpsDeviceToken = process.env.GPS_DEVICE_TOKEN;
  if (!gpsDeviceToken) {
    console.error("GPS API is missing its server-side device token.");
    return NextResponse.json({ error: "GPS service is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request, gpsDeviceToken)) {
    return NextResponse.json({ error: "Unauthorized GPS device" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "GPS request is too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "GPS request is too large" }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isGpsPayload(payload)) {
    return NextResponse.json({ error: "Invalid GPS data" }, { status: 400 });
  }
  const isHargeisaPosition = isWithinHargeisa(payload.latitude, payload.longitude);
  if (!isHargeisaPosition && !isWithinSomaliland(payload.latitude, payload.longitude)) {
    return NextResponse.json({ error: "GPS position is outside the Hargeisa/Somaliland service area" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("GPS API is missing its server-side Supabase configuration.");
    return NextResponse.json({ error: "GPS service is not configured" }, { status: 503 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const plateNumber = payload.plate_number.trim();
  const { data: matches, error: findError } = await supabaseAdmin
    .from("vehicles")
    .select("id,user_id")
    .eq("plate_number", plateNumber)
    .limit(2);

  if (findError) {
    console.error("GPS API could not find the vehicle.", findError);
    return NextResponse.json({ error: "Could not process GPS update" }, { status: 500 });
  }
  if (!matches?.length) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: "Vehicle plate number is not unique. Contact the fleet administrator." },
      { status: 409 },
    );
  }

  const vehicle = matches[0];
  if (!isHargeisaPosition) {
    const now = new Date().toISOString();
    const { data: permissions, error: permissionError } = await supabaseAdmin
      .from("trip_permission_requests")
      .select("id")
      .eq("vehicle_id", vehicle.id)
      .eq("user_id", vehicle.user_id)
      .eq("status", "approved")
      .lte("departure_at", now)
      .gte("return_at", now)
      .limit(1);

    if (permissionError) {
      console.error("GPS API could not verify the vehicle's regional travel permission.", permissionError);
      return NextResponse.json({ error: "Could not verify travel permission" }, { status: 500 });
    }
    if (!permissions?.length) {
      return NextResponse.json(
        { error: "Administrative approval is required before GPS tracking outside Hargeisa" },
        { status: 403 },
      );
    }
  }

  const speed = payload.speed_kmh ?? 0;
  const now = new Date().toISOString();
  const position = {
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed_kmh: speed,
    status: speed > 2 ? "moving" : "stationary",
    last_seen: now,
    updated_at: now,
  };

  const { error: updateError } = await supabaseAdmin
    .from("vehicles")
    .update(position)
    .eq("id", vehicle.id)
    .eq("user_id", vehicle.user_id);

  if (updateError) {
    console.error("GPS API could not update the vehicle position.", updateError);
    return NextResponse.json({ error: "Could not process GPS update" }, { status: 500 });
  }

  const { error: historyError } = await supabaseAdmin
    .from("vehicle_locations")
    .insert({
      vehicle_id: vehicle.id,
      user_id: vehicle.user_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed_kmh: speed,
      recorded_at: now,
    });

  if (historyError) {
    console.error("GPS API could not save vehicle location history.", historyError);
    return NextResponse.json({ error: "Could not save GPS location history" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
