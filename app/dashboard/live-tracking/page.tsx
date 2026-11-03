"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CarFront, Check, MapPin, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../../../src/lib/supabase/client";
import {
  distanceKm,
  isWithinHargeisa,
  isWithinSomaliland,
} from "../../../lib/hargeisa-geo";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";

type VehicleStatus = "moving" | "stationary" | "offline";

type Vehicle = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate_number: string;
  status: VehicleStatus;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number;
  passenger_count: number;
  last_seen: string | null;
};

type VehicleLocation = {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  recorded_at: string;
};

type TripPermissionRequest = {
  id: string;
  user_id: string;
  vehicle_id: string;
  vehicle_name: string;
  plate_number: string;
  destination_region: string;
  destination_city: string;
  purpose: string;
  passenger_count: number;
  departure_at: string;
  return_at: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

type VehicleForm = {
  name: string;
  brand: string;
  model: string;
  year: string;
  plate_number: string;
  latitude: string;
  longitude: string;
  passenger_count: string;
};

const emptyForm: VehicleForm = {
  name: "",
  brand: "",
  model: "",
  year: "",
  plate_number: "",
  latitude: "",
  longitude: "",
  passenger_count: "0",
};

const LiveTrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => <p className="tracking-map-loading">Loading map...</p>,
});

function parseVehicleLocation(value: unknown): VehicleLocation | null {
  if (!value || typeof value !== "object") return null;
  const location = value as Record<string, unknown>;
  if (
    typeof location.vehicle_id !== "string"
    || typeof location.latitude !== "number"
    || !Number.isFinite(location.latitude)
    || location.latitude < -90
    || location.latitude > 90
    || typeof location.longitude !== "number"
    || !Number.isFinite(location.longitude)
    || location.longitude < -180
    || location.longitude > 180
    || typeof location.speed_kmh !== "number"
    || !Number.isFinite(location.speed_kmh)
    || location.speed_kmh < 0
    || typeof location.recorded_at !== "string"
    || !Number.isFinite(Date.parse(location.recorded_at))
  ) {
    return null;
  }

  return {
    vehicle_id: location.vehicle_id,
    latitude: location.latitude,
    longitude: location.longitude,
    speed_kmh: location.speed_kmh,
    recorded_at: location.recorded_at,
  };
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const detail = error as { code?: unknown; message?: unknown };
    if (detail.code === "PGRST205" || detail.code === "42P01") {
      if (typeof detail.message === "string" && detail.message.includes("vehicle_locations")) {
        return "The vehicle_locations table is missing. Create the GPS location-history table in Supabase before using route reports.";
      }
      if (typeof detail.message === "string" && detail.message.includes("trip_permission_requests")) {
        return "The trip permission table is missing. Run supabase/migrations/20261102110000_create_trip_permission_requests.sql in the Supabase SQL Editor.";
      }
      return "The vehicles table is missing. Run supabase/migrations/20261101000000_create_vehicles.sql in the Supabase SQL Editor.";
    }
    if (
      (detail.code === "42703" || detail.code === "PGRST204")
      && typeof detail.message === "string"
      && detail.message.includes("passenger_count")
    ) {
      return "The passenger count field is missing. Run supabase/migrations/20261102100000_add_vehicle_passenger_count.sql in the Supabase SQL Editor.";
    }
    if (detail.code === "42501") {
      return "Supabase denied access. Check that the trip permission migration and Administrator app_metadata role are configured.";
    }
    if (
      detail.code === "23514"
      && typeof detail.message === "string"
      && detail.message.includes("vehicles_status_check")
    ) {
      return "The vehicles status constraint is outdated. Run supabase/migrations/20261101120000_fix_vehicle_status_constraint.sql in the Supabase SQL Editor, then try again.";
    }
    if (typeof detail.message === "string" && detail.message.trim()) return detail.message;
  }
  return error instanceof Error ? error.message : "Could not load GPS vehicles.";
}

function formatLastSeen(value: string | null) {
  if (!value) return "No GPS update";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown update time" : date.toLocaleString();
}

export default function LiveTrackingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusClock, setStatusClock] = useState(() => Date.now());
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationHistory, setLocationHistory] = useState<VehicleLocation[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<TripPermissionRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [permissionFormOpen, setPermissionFormOpen] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const selectedVehicleIdRef = useRef(selectedId);
  selectedVehicleIdRef.current = selectedId;

  async function refreshTripPermissions() {
    try {
      const { data, error: requestsError } = await createClient()
        .from("trip_permission_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      if (requestsError) throw requestsError;
      setPermissionRequests((data ?? []) as TripPermissionRequest[]);
      setPermissionError("");
    } catch (requestError) {
      setPermissionError(getErrorMessage(requestError));
    }
  }

  const loadVehicles = useCallback(async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("vehicles")
        .select("id,name,brand,model,year,plate_number,status,latitude,longitude,speed_kmh,passenger_count,last_seen")
        .order("name");
      if (queryError) throw queryError;
      const nextVehicles = (data ?? []) as Vehicle[];
      setVehicles(nextVehicles);
      setSelectedId((current) => current && nextVehicles.some((vehicle) => vehicle.id === current)
        ? current
        : nextVehicles[0]?.id ?? null);
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | undefined;

    async function startTracking() {
      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!data.user) throw new Error("Sign in before viewing GPS tracking.");
      const administrator = data.user.app_metadata.role === "Administrator";
      setCurrentUserId(data.user.id);
      setIsAdministrator(administrator);

      await loadVehicles();
      if (!active) return;

      await refreshTripPermissions();
      if (!active) return;

      channel = supabase
        .channel(`live-vehicles-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicles",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => void loadVehicles(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vehicle_locations",
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            const location = parseVehicleLocation(payload.new);
            if (!location) return;

            setVehicles((currentVehicles) => currentVehicles.map((vehicle) => {
              if (vehicle.id !== location.vehicle_id) return vehicle;

              const previousTime = vehicle.last_seen ? Date.parse(vehicle.last_seen) : Number.NEGATIVE_INFINITY;
              if (Number.isFinite(previousTime) && Date.parse(location.recorded_at) < previousTime) {
                return vehicle;
              }

              return {
                ...vehicle,
                latitude: location.latitude,
                longitude: location.longitude,
                speed_kmh: location.speed_kmh,
                status: location.speed_kmh > 2 ? "moving" : "stationary",
                last_seen: location.recorded_at,
              };
            }));
            if (location.vehicle_id === selectedVehicleIdRef.current) {
              setLocationHistory((current) => {
                if (current.some((item) => item.recorded_at === location.recorded_at)) return current;
                return [...current, location]
                  .sort((left, right) => left.recorded_at.localeCompare(right.recorded_at))
                  .slice(-1000);
              });
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "trip_permission_requests",
          },
          () => void refreshTripPermissions(),
        )
        .subscribe((status) => {
          if (active && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
            setError("Live GPS updates could not connect. Check that vehicles and vehicle_locations are enabled in Supabase Realtime.");
          }
        });
    }

    void startTracking().catch((trackingError: unknown) => {
      if (active) {
        setError(getErrorMessage(trackingError));
        setLoading(false);
      }
    });

    const refreshTimer = window.setInterval(() => void loadVehicles(), 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      if (channel) void createClient().removeChannel(channel);
    };
  }, [loadVehicles]);

  useEffect(() => {
    const timer = window.setInterval(() => setStatusClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLocationHistory([]);
      return;
    }

    let active = true;
    setLocationHistory([]);
    async function loadLocationHistory() {
      try {
        const { data, error: historyError } = await createClient()
          .from("vehicle_locations")
          .select("vehicle_id,latitude,longitude,speed_kmh,recorded_at")
          .eq("vehicle_id", selectedId)
          .order("recorded_at", { ascending: true })
          .limit(1000);
        if (historyError) throw historyError;
        if (active) {
          setLocationHistory((data ?? [])
            .map(parseVehicleLocation)
            .filter((location): location is VehicleLocation => location !== null));
        }
      } catch (historyError) {
        if (active) setError(getErrorMessage(historyError));
      }
    }

    void loadLocationHistory();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const displayedVehicles = useMemo(() => vehicles.map((vehicle) => {
    const lastSeenTime = vehicle.last_seen ? Date.parse(vehicle.last_seen) : Number.NaN;
    if (!Number.isFinite(lastSeenTime) || statusClock - lastSeenTime > 120_000) {
      return { ...vehicle, status: "offline" as const };
    }
    return { ...vehicle, status: vehicle.speed_kmh > 2 ? "moving" as const : "stationary" as const };
  }), [statusClock, vehicles]);
  const selectedVehicle = displayedVehicles.find((vehicle) => vehicle.id === selectedId) ?? null;
  const deviceLocationPreview: [number, number] | null = formOpen && !editingVehicle
    && form.latitude && form.longitude
    && Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude))
    ? [Number(form.latitude), Number(form.longitude)]
    : null;
  const visibleVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return displayedVehicles.filter((vehicle) =>
      `${vehicle.name} ${vehicle.plate_number}`.toLowerCase().includes(query),
    );
  }, [displayedVehicles, search]);

  const movingCount = displayedVehicles.filter((vehicle) => vehicle.status === "moving").length;
  const offlineCount = displayedVehicles.filter((vehicle) => vehicle.status === "offline").length;
  const pendingPermissionRequests = permissionRequests.filter((request) => request.status === "pending");
  const selectedPermissions = permissionRequests.filter((request) => request.vehicle_id === selectedVehicle?.id);
  const now = Date.now();
  const activeTripPermission = selectedPermissions.find((request) =>
    request.status === "approved"
    && Date.parse(request.departure_at) <= now
    && Date.parse(request.return_at) >= now,
  ) ?? null;
  const locationIsInHargeisa = selectedVehicle?.latitude !== null
    && selectedVehicle?.latitude !== undefined
    && selectedVehicle.longitude !== null
    && selectedVehicle.longitude !== undefined
    && isWithinHargeisa(selectedVehicle.latitude, selectedVehicle.longitude);
  const locationIsApproved = selectedVehicle?.latitude !== null
    && selectedVehicle?.latitude !== undefined
    && selectedVehicle.longitude !== null
    && selectedVehicle.longitude !== undefined
    && Boolean(activeTripPermission)
    && isWithinSomaliland(selectedVehicle.latitude, selectedVehicle.longitude);
  const actualRouteHistory = locationHistory.filter((location) => {
    if (!activeTripPermission) return isWithinHargeisa(location.latitude, location.longitude);
    return Date.parse(location.recorded_at) >= Date.parse(activeTripPermission.departure_at)
      && Date.parse(location.recorded_at) <= Date.parse(activeTripPermission.return_at)
      && isWithinSomaliland(location.latitude, location.longitude);
  });
  const routeHistory = actualRouteHistory;
  const travelledKm = routeHistory.slice(1).reduce((total, location, index) =>
    total + distanceKm(routeHistory[index], location), 0);
  const routeCoordinates = routeHistory.map((location): [number, number] => [location.latitude, location.longitude]);

  async function submitTripPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicle || !currentUserId) {
      setPermissionError("Select a tracked vehicle and sign in before requesting permission.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const departureAtValue = String(formData.get("departureAt") ?? "");
    const returnAtValue = String(formData.get("returnAt") ?? "");
    const departureAt = new Date(departureAtValue);
    const returnAt = new Date(returnAtValue);
    const purpose = String(formData.get("purpose") ?? "").trim();
    const destinationCity = String(formData.get("destinationCity") ?? "").trim();
    const destinationRegion = String(formData.get("destinationRegion") ?? "");
    if (!destinationCity || !purpose || !Number.isFinite(departureAt.getTime())
      || !Number.isFinite(returnAt.getTime()) || returnAt <= departureAt) {
      setPermissionError("Enter a destination, purpose, valid departure time, and return time after departure.");
      return;
    }

    setPermissionSaving(true);
    setPermissionError("");
    try {
      const { data: request, error: insertError } = await createClient()
        .from("trip_permission_requests")
        .insert({
          user_id: currentUserId,
          vehicle_id: selectedVehicle.id,
          vehicle_name: selectedVehicle.name,
          plate_number: selectedVehicle.plate_number,
          destination_region: destinationRegion,
          destination_city: destinationCity,
          purpose,
          passenger_count: selectedVehicle.passenger_count,
          departure_at: departureAt.toISOString(),
          return_at: returnAt.toISOString(),
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      setPermissionRequests((requests) => [request as TripPermissionRequest, ...requests]);
      setPermissionFormOpen(false);
    } catch (requestError) {
      setPermissionError(getErrorMessage(requestError));
    } finally {
      setPermissionSaving(false);
    }
  }

  async function decideTripPermission(request: TripPermissionRequest, status: "approved" | "rejected") {
    if (!isAdministrator || !currentUserId) {
      setPermissionError("Only an administrator can decide regional travel requests.");
      return;
    }
    try {
      const decidedAt = new Date().toISOString();
      const { data: updatedRequest, error: decisionError } = await createClient()
        .from("trip_permission_requests")
        .update({ status, decided_at: decidedAt, decided_by: currentUserId })
        .eq("id", request.id)
        .select("*")
        .single();
      if (decisionError) throw decisionError;
      setPermissionRequests((requests) => requests.map((item) =>
        item.id === request.id ? updatedRequest as TripPermissionRequest : item,
      ));
      setPermissionError("");
    } catch (decisionError) {
      setPermissionError(getErrorMessage(decisionError));
    }
  }

  function openCreateForm() {
    setEditingVehicle(null);
    setForm(emptyForm);
    setError("");
    setLocationMessage("");
    setFormOpen(true);
    detectDeviceLocation();
  }

  function detectDeviceLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support device location.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationMessage("Device location requires HTTPS or localhost. Open this site securely and try again.");
      return;
    }

    setLocating(true);
    setLocationMessage("Finding this device’s current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isWithinHargeisa(latitude, longitude)) {
          setLocationMessage("This device is outside Hargeisa. Location was not saved.");
          setLocating(false);
          return;
        }

        setForm((current) => ({
          ...current,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        setLocationMessage("Current device location found in Hargeisa.");
        setLocating(false);
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? "Location access was denied. Allow location access in your browser and retry."
          : locationError.code === locationError.POSITION_UNAVAILABLE
            ? "The device could not determine its location. Check GPS/location services and retry."
            : "Finding the device location took too long. Retry in an area with a clear GPS signal.";
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }

  function openEditForm(vehicle: Vehicle) {
    const savedVehicle = vehicles.find((item) => item.id === vehicle.id) ?? vehicle;
    setEditingVehicle(savedVehicle);
    setError("");
    setLocationMessage("Saved vehicle position loaded. Update it from this device if the vehicle is here.");
    setFormOpen(true);
    setForm({
      name: savedVehicle.name,
      brand: savedVehicle.brand ?? "",
      model: savedVehicle.model ?? "",
      year: savedVehicle.year === null ? "" : String(savedVehicle.year),
      plate_number: savedVehicle.plate_number,
      latitude: savedVehicle.latitude?.toString() ?? "",
      longitude: savedVehicle.longitude?.toString() ?? "",
      passenger_count: String(savedVehicle.passenger_count ?? 0),
    });
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = form.latitude.trim() ? Number(form.latitude) : null;
    const longitude = form.longitude.trim() ? Number(form.longitude) : null;
    const speed = 0;
    const passengerCount = Number(form.passenger_count);
    const year = Number(form.year);

    if (!form.name.trim() || !form.brand.trim() || !form.model.trim() || !form.plate_number.trim()) {
      setError("Enter the vehicle name, brand, model, and plate number.");
      return;
    }
    if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
      setError("Enter a valid vehicle year.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Wait for this device’s location to be detected before saving.");
      return;
    }
    if (!isWithinHargeisa(latitude, longitude)) {
      setError("GPS coordinates must be within Hargeisa for this tracking workspace.");
      return;
    }
    if (!Number.isInteger(passengerCount) || passengerCount < 0 || passengerCount > 100) {
      setError("Enter a whole number of passengers from 0 to 100.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sign in before saving a vehicle.");

      const vehicleData = {
        user_id: user.id,
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year,
        plate_number: form.plate_number.trim(),
        status: "stationary" as VehicleStatus,
        latitude,
        longitude,
        speed_kmh: speed,
        passenger_count: passengerCount,
        last_seen: latitude !== null ? new Date().toISOString() : editingVehicle?.last_seen ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: savedVehicle, error: saveError } = editingVehicle
        ? await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("id", editingVehicle.id)
          .select("id")
          .single()
        : await supabase
          .from("vehicles")
          .insert(vehicleData)
          .select("id")
          .single();
      if (saveError) throw saveError;

      if (latitude !== null && longitude !== null) {
        const { error: locationError } = await supabase
          .from("vehicle_locations")
          .insert({
            vehicle_id: savedVehicle.id,
            user_id: user.id,
            latitude,
            longitude,
            speed_kmh: speed,
            recorded_at: vehicleData.last_seen,
          });
        if (locationError) throw locationError;
      }

      setSelectedId(savedVehicle.id);
      setForm(emptyForm);
      setEditingVehicle(null);
      setFormOpen(false);
      await loadVehicles();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteVehicle(vehicle: Vehicle) {
    if (!window.confirm(`Remove ${vehicle.name} (${vehicle.plate_number}) from GPS tracking?`)) return;
    try {
      const { error: deleteError } = await createClient()
        .from("vehicles")
        .delete()
        .eq("id", vehicle.id);
      if (deleteError) throw deleteError;
      await loadVehicles();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/live-tracking" />
      <main className="contract-main-panel live-tracking-panel">
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard" className="topbar-home-link">Fleetora</Link>
            <span className="topbar-separator">›</span>
            <span className="current-page">Live Tracking</span>
          </div>
          <div className="topbar-right"><TopbarActions /></div>
        </header>

        <div className="live-tracking-content-body">
          <div className="live-tracking-title-row">
            <div className="page-heading">
              <h1>Live GPS tracking</h1>
              <p>Hargeisa only · Live vehicle positions, routes, and automatic reports.</p>
            </div>
            <button type="button" className="primary-blue-btn" onClick={openCreateForm}>
              <Plus size={16} />
              <span>Add tracked vehicle</span>
            </button>
          </div>

          <section className="tracking-summary" aria-label="Hargeisa tracking summary">
            <article><span>Tracked vehicles</span><strong>{vehicles.length}</strong></article>
            <article><span>Moving</span><strong>{movingCount}</strong></article>
            <article><span>Offline</span><strong>{offlineCount}</strong></article>
            <button type="button" className="secondary-action" onClick={() => void loadVehicles(true)} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "tracking-spin" : ""} />
              <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </section>

          {error ? <div className="storage-message tracking-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div> : null}
          {permissionError ? <div className="storage-message tracking-error" role="alert"><AlertCircle size={16} /><span>{permissionError}</span></div> : null}

          <section className="trip-permission-panel" aria-label="Regional travel permissions">
            <div className="trip-permission-heading">
              <div>
                <h2>{isAdministrator ? "Regional travel approvals" : "Regional travel permissions"}</h2>
                <p>{isAdministrator
                  ? `${pendingPermissionRequests.length} request${pendingPermissionRequests.length === 1 ? "" : "s"} awaiting your decision.`
                  : "Travel outside Hargeisa requires administrator approval before departure."}</p>
              </div>
              <div className="trip-permission-tools">
                <button type="button" className="trip-permission-refresh" onClick={() => void refreshTripPermissions()} aria-label="Refresh travel requests" title="Refresh travel requests"><RefreshCw size={14} /></button>
                <ShieldCheck size={20} />
              </div>
            </div>
            {permissionRequests.length ? (
              <div className="trip-permission-list">
                {permissionRequests.map((request) => (
                  <article className="trip-permission-item" key={request.id}>
                    <div className="trip-permission-copy">
                      <strong>{request.vehicle_name} · {request.plate_number}</strong>
                      <span>{request.destination_city}, {request.destination_region} · {request.passenger_count} people · {request.purpose}</span>
                      <small>{formatLastSeen(request.departure_at)} – {formatLastSeen(request.return_at)}</small>
                    </div>
                    <span className={`trip-permission-status ${request.status}`}>{request.status}</span>
                    {isAdministrator && request.status === "pending" ? (
                      <div className="trip-permission-actions">
                        <button type="button" aria-label={`Approve trip to ${request.destination_city}`} onClick={() => void decideTripPermission(request, "approved")}><Check size={15} /> Approve</button>
                        <button type="button" aria-label={`Reject trip to ${request.destination_city}`} onClick={() => void decideTripPermission(request, "rejected")}><X size={15} /> Reject</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="trip-permission-empty">{isAdministrator ? "No regional travel requests need review." : "No regional travel requests yet."}</p>
            )}
          </section>

          <div className="live-tracking-grid fleet-layout">
            <aside className="vehicle-list-column fleet-sidebar">
              <label className="vehicle-search-box">
                <Search size={15} className="search-icon" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles" aria-label="Search vehicles" />
              </label>
              <div className="vehicle-cards-scroll">
                {loading ? <p className="tracking-list-message">Loading vehicles…</p> : null}
                {!loading && visibleVehicles.length === 0 ? (
                  <div className="tracking-list-empty">
                    <CarFront size={22} />
                    <strong>{vehicles.length ? "No vehicles found" : "No tracked vehicles yet"}</strong>
                    <span>{vehicles.length ? "Try another name or plate number." : "Add a vehicle and enter its GPS coordinates to show it on the map."}</span>
                  </div>
                ) : null}
                {visibleVehicles.map((vehicle) => (
                  <button
                    type="button"
                    key={vehicle.id}
                    className={`vehicle-card ${vehicle.id === selectedId ? "selected" : ""}`}
                    onClick={() => setSelectedId(vehicle.id)}
                  >
                    <span className="vehicle-card-icon-wrap"><CarFront size={18} /></span>
                    <span className="vehicle-card-info">
                      <span className="vehicle-card-title">{vehicle.name}</span>
                      <span className="vehicle-card-subtitle">{vehicle.plate_number} · {vehicle.status}</span>
                    </span>
                    <span className={`status-tag ${
                      vehicle.latitude !== null && vehicle.longitude !== null && isWithinHargeisa(vehicle.latitude, vehicle.longitude)
                        ? vehicle.status === "offline" ? "offline" : "live"
                        : "offline"
                    }`}>
                      {vehicle.latitude !== null && vehicle.longitude !== null && isWithinHargeisa(vehicle.latitude, vehicle.longitude)
                        ? vehicle.status
                        : "outside Hargeisa"}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="map-view-column tracking-map-column fleet-map" aria-label="Vehicle locations map">
              <LiveTrackingMap
                vehicles={visibleVehicles}
                selectedVehicle={locationIsInHargeisa || locationIsApproved ? selectedVehicle : null}
                deviceLocationPreview={deviceLocationPreview}
                onSelect={setSelectedId}
                route={routeCoordinates}
                allowRegionalTravel={Boolean(activeTripPermission)}
              />
              {selectedVehicle ? (
                <div className="tracking-vehicle-card">
                  <div className="tracking-vehicle-heading">
                    <div><h2>Automatic vehicle report</h2><p>{selectedVehicle.name} · {selectedVehicle.plate_number}</p></div>
                    <span className={`status-tag ${
                      !locationIsInHargeisa || selectedVehicle.status === "offline" ? "offline" : "live"
                    }`}>{locationIsApproved
                      ? `approved trip · ${selectedVehicle.status}`
                      : locationIsInHargeisa ? selectedVehicle.status : "outside Hargeisa"}</span>
                  </div>
                  <div className="tracking-vehicle-stats">
                    <span>Current area<strong>{locationIsInHargeisa ? "Hargeisa" : locationIsApproved ? `${activeTripPermission?.destination_city}, ${activeTripPermission?.destination_region}` : "Outside Hargeisa — approval required"}</strong></span>
                    <span>Current location<strong>{locationIsInHargeisa || locationIsApproved ? `${selectedVehicle.latitude}, ${selectedVehicle.longitude}` : "No authorized GPS fix"}</strong></span>
                    <span>Driving status<strong>{locationIsInHargeisa || locationIsApproved ? selectedVehicle.status : "Not tracked here"}</strong></span>
                    <span>Speed<strong>{locationIsInHargeisa || locationIsApproved ? `${selectedVehicle.speed_kmh} km/h` : "—"}</strong></span>
                    <span>People on board<strong>{selectedVehicle.passenger_count}</strong></span>
                    <span>Route distance<strong>{travelledKm.toFixed(2)} km · {routeHistory.length} GPS points</strong></span>
                    <span>Last GPS update<strong>{formatLastSeen(selectedVehicle.last_seen)}</strong></span>
                    <span>Route started<strong>{routeHistory[0] ? formatLastSeen(routeHistory[0].recorded_at) : "Waiting for GPS history"}</strong></span>
                  </div>
                  <div className="tracking-vehicle-actions">
                    {locationIsInHargeisa || locationIsApproved ? (
                      <a href={`https://www.google.com/maps?q=${selectedVehicle.latitude},${selectedVehicle.longitude}`} target="_blank" rel="noreferrer">
                        <MapPin size={14} /> Open in Google Maps
                      </a>
                    ) : <span className="tracking-no-location">
                      {selectedVehicle.latitude === null || selectedVehicle.longitude === null
                        ? "Waiting for GPS coordinates"
                        : "Position is outside Hargeisa"}
                    </span>}
                    <button
                      type="button"
                      onClick={() => {
                        setPermissionError("");
                        setPermissionFormOpen(true);
                      }}
                    >
                      Request regional travel
                    </button>
                    <button type="button" onClick={() => openEditForm(selectedVehicle)}>Edit</button>
                    <button type="button" className="tracking-delete-button" aria-label={`Remove ${selectedVehicle.name}`} onClick={() => void deleteVehicle(selectedVehicle)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
          <p className="tracking-footnote">Map and live reports are restricted to Hargeisa. GPS history draws the route; people on board is entered manually.</p>
        </div>
      </main>

      {formOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setFormOpen(false); setEditingVehicle(null); } }}>
          <section className="create-dialog tracking-dialog" role="dialog" aria-modal="true" aria-labelledby="tracking-form-title">
            <div className="dialog-heading">
              <div><h2 id="tracking-form-title">{editingVehicle ? "Edit tracked vehicle" : "Add tracked vehicle"}</h2><p>The device location is detected automatically. For a live vehicle position, open this page on a device inside the vehicle.</p></div>
              <button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => { setFormOpen(false); setEditingVehicle(null); }}>×</button>
            </div>
            <form className="payment-form tracking-form" onSubmit={(event) => void saveVehicle(event)}>
              <label>Vehicle name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label>Brand<input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="e.g. Toyota" /></label>
              <label>Model<input required value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="e.g. Hilux" /></label>
              <label>Year<input required type="number" min="1886" max={new Date().getFullYear() + 1} step="1" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="e.g. 2024" /></label>
              <label>Plate number<input required value={form.plate_number} onChange={(event) => setForm({ ...form, plate_number: event.target.value })} /></label>
              <label>People on board<input required type="number" min="0" max="100" step="1" value={form.passenger_count} onChange={(event) => setForm({ ...form, passenger_count: event.target.value })} /></label>
              <p className="trip-permission-note">Status uses real GPS speed: above 2 km/h is moving, 2 km/h or less is stationary. If no GPS update arrives for 2 minutes, the vehicle is marked offline. No simulated movement is shown.</p>
              <div className="tracking-location-control">
                <p className={locationMessage.includes("found") || locationMessage.includes("loaded") ? "success" : ""} role="status">
                  <MapPin size={15} />
                  <span>{locating ? "Finding current location…" : locationMessage || "Location has not been detected yet."}</span>
                </p>
                <button type="button" className="secondary-action" onClick={detectDeviceLocation} disabled={locating}>
                  <MapPin size={14} /> {locating ? "Locating…" : editingVehicle ? "Update from this device" : "Retry location"}
                </button>
              </div>
              {error ? <p className="tracking-form-error" role="alert">{error}</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => { setFormOpen(false); setEditingVehicle(null); setError(""); }}>Cancel</button>
                <button type="submit" className="primary-action" disabled={saving}>{saving ? "Saving…" : editingVehicle ? "Save changes" : "Add vehicle"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {permissionFormOpen && selectedVehicle ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPermissionFormOpen(false); }}>
          <section className="create-dialog tracking-dialog" role="dialog" aria-modal="true" aria-labelledby="trip-permission-title">
            <div className="dialog-heading">
              <div>
                <h2 id="trip-permission-title">Request regional travel approval</h2>
                <p>{selectedVehicle.name} · {selectedVehicle.plate_number} · Hargeisa to a Somaliland region</p>
              </div>
              <button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setPermissionFormOpen(false)}>×</button>
            </div>
            <form className="payment-form tracking-form" onSubmit={(event) => void submitTripPermission(event)}>
              <label>Destination region
                <select name="destinationRegion" required defaultValue="">
                  <option value="" disabled>Select region</option>
                  <option>Awdal</option>
                  <option>Maroodi Jeex</option>
                  <option>Sahil</option>
                  <option>Togdheer</option>
                  <option>Sool</option>
                  <option>Sanaag</option>
                </select>
              </label>
              <label>Destination town / city<input name="destinationCity" required placeholder="e.g. Berbera" /></label>
              <label>Reason for travel<textarea name="purpose" required rows={3} /></label>
              <div className="tracking-coordinate-fields">
                <label>Departure<input name="departureAt" type="datetime-local" required /></label>
                <label>Expected return<input name="returnAt" type="datetime-local" required /></label>
              </div>
              <p className="trip-permission-note">The vehicle GPS will be permitted outside Hargeisa only during the approved travel window. Requests stay blocked until an administrator approves them.</p>
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setPermissionFormOpen(false)}>Cancel</button>
                <button type="submit" className="primary-action" disabled={permissionSaving}>{permissionSaving ? "Sending…" : "Send for approval"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
