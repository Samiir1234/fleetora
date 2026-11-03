"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import {
  HARGEISA_BOUNDS,
  HARGEISA_CENTER,
  isWithinHargeisa,
  isWithinSomaliland,
  SOMALILAND_BOUNDS,
} from "../../../lib/hargeisa-geo";

type Vehicle = {
  id: string;
  name: string;
  plate_number: string;
  status: "moving" | "stationary" | "offline";
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number;
  last_seen: string | null;
};

type MappedVehicle = Vehicle & { latitude: number; longitude: number };

function FitSelectedVehicle({
  vehicle,
  deviceLocationPreview,
}: {
  vehicle: Vehicle | null;
  deviceLocationPreview: [number, number] | null;
}) {
  const map = useMap();
  const previousTarget = useRef("");

  useEffect(() => {
    const target = deviceLocationPreview
      ?? (vehicle?.latitude !== null && vehicle?.latitude !== undefined
        && vehicle.longitude !== null && vehicle.longitude !== undefined
        ? [vehicle.latitude, vehicle.longitude] as [number, number]
        : null);
    if (!target) return;
    const targetKey = deviceLocationPreview
      ? `device:${target[0]},${target[1]}`
      : `vehicle:${vehicle?.id}`;
    if (previousTarget.current === targetKey) return;
    map.flyTo(target, 16, { duration: 1.2 });
    previousTarget.current = targetKey;
  }, [deviceLocationPreview, map, vehicle]);

  useEffect(() => {
    if (deviceLocationPreview) return;
    if (!vehicle || vehicle.latitude === null || vehicle.longitude === null) return;

    const point = map.latLngToContainerPoint([vehicle.latitude, vehicle.longitude]);
    const size = map.getSize();
    const marginX = size.x * 0.25;
    const marginY = size.y * 0.25;
    const deltaX = point.x < marginX
      ? point.x - size.x / 2
      : point.x > size.x - marginX
        ? point.x - size.x / 2
        : 0;
    const deltaY = point.y < marginY
      ? point.y - size.y / 2
      : point.y > size.y - marginY
        ? point.y - size.y / 2
        : 0;

    if (deltaX || deltaY) {
      map.panBy([deltaX, deltaY], { animate: true, duration: 0.8 });
    }
  }, [deviceLocationPreview, map, vehicle]);

  return null;
}

function markerIcon(status: Vehicle["status"], selected: boolean) {
  return L.divIcon({
    className: `tracking-map-marker tracking-map-marker-${status}${selected ? " tracking-map-marker-selected" : ""}`,
    html: '<span aria-hidden="true">🚘</span>',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
}

function VehicleMarker({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: MappedVehicle;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const icon = useMemo(() => markerIcon(vehicle.status, selected), [vehicle.status, selected]);
  const position = useMemo<[number, number]>(
    () => [vehicle.latitude, vehicle.longitude],
    [vehicle.latitude, vehicle.longitude],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={1000}
      riseOnHover
      eventHandlers={{ click: () => onSelect(vehicle.id) }}
    >
      <Popup>
        <strong>{vehicle.name}</strong>
        <br />
        Plate: {vehicle.plate_number}
        <br />
        Status: {vehicle.status}
        <br />
        Speed: {vehicle.speed_kmh} km/h
        <br />
        Last update: {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleString() : "No GPS update"}
      </Popup>
    </Marker>
  );
}

function KeepMapSized() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    map.invalidateSize({ pan: false });
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function TrackingMap({
  vehicles,
  selectedVehicle,
  deviceLocationPreview,
  onSelect,
  route,
  allowRegionalTravel,
}: {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  deviceLocationPreview: [number, number] | null;
  onSelect: (id: string) => void;
  route: [number, number][];
  allowRegionalTravel: boolean;
}) {
  const mappedVehicles = vehicles.filter(
    (vehicle): vehicle is MappedVehicle => vehicle.latitude !== null
      && vehicle.longitude !== null
      && (isWithinHargeisa(vehicle.latitude, vehicle.longitude)
        || (allowRegionalTravel && vehicle.id === selectedVehicle?.id
          && isWithinSomaliland(vehicle.latitude, vehicle.longitude))),
  );
  const mapBounds = allowRegionalTravel ? SOMALILAND_BOUNDS : HARGEISA_BOUNDS;
  const center: [number, number] = allowRegionalTravel
    && selectedVehicle?.latitude !== null && selectedVehicle?.latitude !== undefined
    && selectedVehicle.longitude !== null && selectedVehicle.longitude !== undefined
    ? [selectedVehicle.latitude, selectedVehicle.longitude]
    : HARGEISA_CENTER;

  return (
    <div className="tracking-map">
      <MapContainer
        center={center}
        zoom={allowRegionalTravel ? 11 : 13}
        minZoom={allowRegionalTravel ? 7 : 11}
        maxZoom={19}
        maxBounds={[
          [mapBounds.south, mapBounds.west],
          [mapBounds.north, mapBounds.east],
        ]}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="tracking-leaflet-map"
      >
        <KeepMapSized />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={4}
        />
        <FitSelectedVehicle vehicle={selectedVehicle} deviceLocationPreview={deviceLocationPreview} />
        {deviceLocationPreview ? (
          <CircleMarker
            center={deviceLocationPreview}
            radius={10}
            pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.9, weight: 3 }}
          >
            <Popup>This device’s current location</Popup>
          </CircleMarker>
        ) : null}
        {route.length > 1 ? (
          <Polyline positions={route} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }} />
        ) : null}
        {mappedVehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            selected={vehicle.id === selectedVehicle?.id}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
      {mappedVehicles.length === 0 ? (
        <div className="tracking-map-empty">
          <span><MapPin size={18} /></span>
          <strong>No GPS positions available</strong>
          <small>Add coordinates to a vehicle or connect a GPS tracker.</small>
        </div>
      ) : null}
    </div>
  );
}
