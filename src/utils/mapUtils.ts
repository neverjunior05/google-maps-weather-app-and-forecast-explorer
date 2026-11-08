/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Smoothly pans the Google Map camera to a target location with a vertical screen offset.
 * Offsetting the camera slightly north places the marker in the lower half of the viewport,
 * ensuring that upward-opening InfoWindows have full visibility without being clipped by the
 * top edge or overlapping the top search bar.
 *
 * This achieves smooth single-pass camera positioning with ZERO subsequent jumps.
 */
export function panToWithVerticalOffset(
  map: google.maps.Map,
  lat: number,
  lng: number,
  offsetYPixels?: number
) {
  if (!map) return;

  // Calculate dynamic vertical offset based on current viewport height
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Offset ~18% of viewport height (between 110px and 160px)
  const offset = offsetYPixels ?? Math.max(110, Math.min(160, Math.round(vh * 0.18)));

  const projection = map.getProjection();
  const zoom = map.getZoom() ?? 6;

  if (projection) {
    const scale = Math.pow(2, zoom);
    const worldPoint = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
    if (worldPoint) {
      // In Mercator projection, lower y is North (upwards on screen).
      // Moving the camera center North makes the marker sit lower on screen by `offset` pixels.
      const targetPoint = new google.maps.Point(
        worldPoint.x,
        worldPoint.y - offset / scale
      );
      const targetLatLng = projection.fromPointToLatLng(targetPoint);
      if (targetLatLng) {
        map.panTo(targetLatLng);
        return;
      }
    }
  }

  // Fallback if projection is not ready yet: spherical Mercator approximation
  const latRad = (lat * Math.PI) / 180;
  const deltaLat = (offset * 360 * Math.cos(latRad)) / (256 * Math.pow(2, zoom));
  map.panTo({ lat: lat + deltaLat, lng });
}
