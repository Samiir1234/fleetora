import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase/server";

export const runtime = "nodejs";

const MAX_PAGE_SIZE = 100;
const MAX_REQUEST_BYTES = 8_192;

function isAdministrator(user: { email?: string; app_metadata: Record<string, unknown> }) {
  const role = user.app_metadata.role;
  if (typeof role === "string" && ["admin", "administrator"].includes(role.toLowerCase())) {
    return true;
  }

  const allowedAdminEmails = (process.env.SUPABASE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user.email && allowedAdminEmails.includes(user.email.toLowerCase()));
}

function getPositiveInteger(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function requireAdministrator() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
    console.error("Admin drivers API is missing its Supabase configuration.");
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Drivers service is not configured" }, { status: 503 }),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Admin drivers API could not verify the current user.", error);
      return {
        authorized: false as const,
        response: NextResponse.json({ error: "Could not verify authentication" }, { status: 500 }),
      };
    }
    if (!user) {
      return {
        authorized: false as const,
        response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      };
    }
    if (!isAdministrator(user)) {
      return {
        authorized: false as const,
        response: NextResponse.json(
          {
            error: "Admin access required. Assign this account the trusted Supabase app_metadata.role 'Administrator' or add its email to the server-side SUPABASE_ADMIN_EMAILS setting.",
          },
          { status: 403 },
        ),
      };
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { authorized: true as const, admin };
  } catch (error) {
    console.error("Admin drivers API could not initialize Supabase.", error);
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Could not initialize drivers service" }, { status: 500 }),
    };
  }
}

export async function GET(request: NextRequest) {
  const access = await requireAdministrator();
  if (!access.authorized) return access.response;

  const page = getPositiveInteger(request.nextUrl.searchParams.get("page"), 1);
  const perPage = getPositiveInteger(request.nextUrl.searchParams.get("perPage"), 50);
  if (page === null || perPage === null || perPage > MAX_PAGE_SIZE) {
    return NextResponse.json(
      { error: `page and perPage must be positive integers; perPage cannot exceed ${MAX_PAGE_SIZE}` },
      { status: 400 },
    );
  }
  try {
    const { data, error } = await access.admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Admin system-users API could not list Supabase accounts.", error);
      return NextResponse.json({ error: "Could not load system users" }, { status: 500 });
    }

    return NextResponse.json({
      users: data.users.map((account) => ({
        id: account.id,
        email: account.email ?? null,
        full_name: typeof account.user_metadata.full_name === "string"
          ? account.user_metadata.full_name
          : null,
        phone: typeof account.user_metadata.phone === "string"
          ? account.user_metadata.phone
          : account.phone ?? null,
        role: typeof account.app_metadata.role === "string"
          ? account.app_metadata.role
          : "System user",
        created_at: account.created_at,
        last_sign_in_at: account.last_sign_in_at ?? null,
      })),
      page,
      perPage,
      nextPage: data.nextPage,
    });
  } catch (error) {
    console.error("Admin system-users API encountered an unexpected list error.", error);
    return NextResponse.json({ error: "Could not load system users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdministrator();
  if (!access.authorized) return access.response;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid driver data" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required" },
      { status: 400 },
    );
  }
  if (
    fullName.length > 100
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json({ error: "Invalid name or email" }, { status: 400 });
  }
  if (input.phone !== undefined && typeof input.phone !== "string") {
    return NextResponse.json({ error: "Phone must be a string" }, { status: 400 });
  }
  if (phone.length > 40) {
    return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await access.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || null },
      app_metadata: { role: "drivers" },
    });

    if (error || !data.user) {
      if (error) console.error("Admin drivers API could not create the driver account.", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create driver" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Driver created successfully",
        driver: {
          id: data.user.id,
          full_name: fullName,
          email,
          phone: phone || null,
          role: "drivers",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin drivers API encountered an unexpected create error.", error);
    return NextResponse.json({ error: "Could not create driver" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdministrator();
  if (!access.authorized) return access.response;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const userId = typeof input.id === "string" ? input.id.trim() : "";
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (!userId || !fullName || fullName.length > 100) {
    return NextResponse.json({ error: "A valid user ID and name are required" }, { status: 400 });
  }
  if (input.phone !== undefined && typeof input.phone !== "string") {
    return NextResponse.json({ error: "Phone must be a string" }, { status: 400 });
  }
  if (phone.length > 40) {
    return NextResponse.json({ error: "Phone number is too long" }, { status: 400 });
  }

  try {
    const { data: userResult, error: lookupError } = await access.admin.auth.admin.getUserById(userId);
    if (lookupError || !userResult.user) {
      if (lookupError) console.error("Admin system-users API could not find the account to update.", lookupError);
      return NextResponse.json({ error: "System user not found" }, { status: 404 });
    }

    const { error: updateError } = await access.admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...userResult.user.user_metadata,
        full_name: fullName,
        phone: phone || null,
      },
    });
    if (updateError) {
      console.error("Admin system-users API could not update the account.", updateError);
      return NextResponse.json({ error: "Could not update system user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin system-users API encountered an unexpected update error.", error);
    return NextResponse.json({ error: "Could not update system user" }, { status: 500 });
  }
}
