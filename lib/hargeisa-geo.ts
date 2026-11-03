export const HARGEISA_CENTER: [number, number] = [9.56, 44.06];
export const HARGEISA_BOUNDS = {
  south: 9.35,
  north: 9.75,
  west: 43.85,
  east: 44.28,
} as const;
export const SOMALILAND_BOUNDS = {
  south: 8.0,
  north: 11.5,
  west: 42.0,
  east: 49.0,
} as const;

export function isWithinHargeisa(latitude: number, longitude: number) {
  return latitude >= HARGEISA_BOUNDS.south
    && latitude <= HARGEISA_BOUNDS.north
    && longitude >= HARGEISA_BOUNDS.west
    && longitude <= HARGEISA_BOUNDS.east;
}

export function isWithinSomaliland(latitude: number, longitude: number) {
  return latitude >= SOMALILAND_BOUNDS.south
    && latitude <= SOMALILAND_BOUNDS.north
    && longitude >= SOMALILAND_BOUNDS.west
    && longitude <= SOMALILAND_BOUNDS.east;
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(to.latitude - from.latitude);
  const longitudeDifference = radians(to.longitude - from.longitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(from.latitude))
    * Math.cos(radians(to.latitude))
    * Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
