/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { WeatherMapType } from '../types/weather';

interface WeatherTileOverlayProps {
  mapType: WeatherMapType;
  opacity: number;
  visible: boolean;
  apiKey?: string | null;
  refreshTrigger?: number;
}

export function WeatherTileOverlay({
  mapType,
  opacity,
  visible,
  apiKey,
  refreshTrigger = 0,
}: WeatherTileOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer if present
    if (overlayRef.current) {
      const index = map.overlayMapTypes.getArray().indexOf(overlayRef.current);
      if (index !== -1) {
        map.overlayMapTypes.removeAt(index);
      }
      overlayRef.current = null;
    }

    if (!visible) return;

    // Create ImageMapType for Weather Map Tiles
    const weatherLayer = new google.maps.ImageMapType({
      getTileUrl: (coord: google.maps.Point, zoom: number) => {
        // Handle Mercator wrapping
        const maxTiles = 1 << zoom;
        const normalizedX = ((coord.x % maxTiles) + maxTiles) % maxTiles;
        const y = coord.y;

        if (y < 0 || y >= maxTiles) {
          return '';
        }

        // Securely fetch weather tiles via server-side proxy (keeps backend key secret)
        const cacheBuster = refreshTrigger ? `?t=${refreshTrigger}` : '';
        return `/api/weather/tiles/${mapType}/${zoom}/${normalizedX}/${y}${cacheBuster}`;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: Math.max(0, Math.min(1, opacity)),
      name: `Google Weather ${mapType}`,
      maxZoom: 16,
      minZoom: 0,
    });

    overlayRef.current = weatherLayer;
    map.overlayMapTypes.push(weatherLayer);

    return () => {
      if (map && overlayRef.current) {
        const index = map.overlayMapTypes.getArray().indexOf(overlayRef.current);
        if (index !== -1) {
          map.overlayMapTypes.removeAt(index);
        }
        overlayRef.current = null;
      }
    };
  }, [map, mapType, visible, apiKey, refreshTrigger]);

  // Dynamically update opacity without rebuilding the entire layer
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(Math.max(0, Math.min(1, opacity)));
    }
  }, [opacity]);

  return null;
}
