/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, MapMouseEvent, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LocationWeatherBundle, WeatherLocation, WeatherMapType } from '../types/weather';
import { searchPlaceByCoordinates } from '../services/weatherApi';
import { WeatherTileOverlay } from './WeatherTileOverlay';
import { WeatherMarkers } from './WeatherMarkers';
import { RadarControlBar } from './RadarControlBar';
import { MapFloatingControls } from './MapFloatingControls';
import { panToWithVerticalOffset } from '../utils/mapUtils';

interface WeatherMapProps {
  apiKey: string;
  selectedLocation: WeatherLocation;
  weatherBundle: LocationWeatherBundle | null;
  onSelectLocation: (loc: WeatherLocation) => void;
  radarMapType: WeatherMapType;
  onChangeRadarMapType: (type: WeatherMapType) => void;
  radarOpacity: number;
  onChangeRadarOpacity: (opacity: number) => void;
  radarVisible: boolean;
  onToggleRadarVisible: () => void;
  refreshTrigger: number;
  onTriggerRefresh: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  refreshCountdown?: number;
}

// Inner map coordinator component with useMap() access
function MapContent({
  selectedLocation,
  weatherBundle,
  onSelectLocation,
  radarMapType,
  onChangeRadarMapType,
  radarOpacity,
  onChangeRadarOpacity,
  radarVisible,
  onToggleRadarVisible,
  refreshTrigger,
  onTriggerRefresh,
  apiKey,
  isSidebarCollapsed = true,
  onToggleSidebar,
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
  refreshCountdown = 45,
}: WeatherMapProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showStations, setShowStations] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  const lastPannedCoord = useRef<{ lat: number; lng: number } | null>(null);

  // Pan to selected location smoothly once per coordinate change (avoids double jumping)
  useEffect(() => {
    if (!map || !selectedLocation) return;
    const prev = lastPannedCoord.current;
    if (prev && Math.abs(prev.lat - selectedLocation.lat) < 0.0001 && Math.abs(prev.lng - selectedLocation.lng) < 0.0001) {
      return;
    }
    lastPannedCoord.current = { lat: selectedLocation.lat, lng: selectedLocation.lng };
    panToWithVerticalOffset(map, selectedLocation.lat, selectedLocation.lng);
  }, [map, selectedLocation.lat, selectedLocation.lng]);

  // Click on map to search place name using Places API (New) & trigger weather lookup
  useEffect(() => {
    if (!map) return;

    const clickListener = map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // 1. Immediately place pin with clean coordinates while resolving place name
      onSelectLocation({
        id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        name: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        country: '',
        lat,
        lng,
        isManual: true,
      });

      // 2. Query Places API (New) searchNearby to resolve exact place name (city/town/landmark)
      try {
        const resolved = await searchPlaceByCoordinates(lat, lng, placesLib);
        onSelectLocation({
          ...resolved,
          isManual: true,
        });
      } catch (err) {
        console.warn('Places API (New) click search error:', err);
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, placesLib, onSelectLocation]);

  // Region Jump handler
  const handleJumpRegion = (region: 'US' | 'EU' | 'WORLD') => {
    if (!map) return;
    if (region === 'US') {
      map.setCenter({ lat: 39.8283, lng: -98.5795 });
      map.setZoom(5);
      onChangeRadarMapType('US_PRECIPITATION_CURRENT');
    } else if (region === 'EU') {
      map.setCenter({ lat: 50.1109, lng: 8.6821 });
      map.setZoom(5);
      onChangeRadarMapType('EU_PRECIPITATION_CURRENT');
    } else {
      map.setCenter({ lat: 20.0, lng: 0.0 });
      map.setZoom(3);
    }
  };

  // Locate User Geolocation (triggered strictly on user click of Find My Location button)
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        onSelectLocation({
          id: 'my-location',
          name: 'My Current Location',
          country: 'Local Device',
          lat: latitude,
          lng: longitude,
        });

        // Resolve city name via Places API (New) if available
        try {
          const resolved = await searchPlaceByCoordinates(latitude, longitude, placesLib);
          onSelectLocation({
            ...resolved,
            id: 'my-location',
          });
        } catch {
          // Keep My Current Location label
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation request error or declined by user:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <>
      {/* Weather Map Tile Overlay */}
      <WeatherTileOverlay
        mapType={radarMapType}
        opacity={radarOpacity}
        visible={radarVisible}
        apiKey={apiKey}
        refreshTrigger={refreshTrigger}
      />

      {/* Weather Pins & Stations */}
      <WeatherMarkers
        selectedLocation={selectedLocation}
        currentBundle={weatherBundle}
        onSelectLocation={onSelectLocation}
        showStations={showStations}
        autoRefreshEnabled={autoRefreshEnabled}
        refreshCountdown={refreshCountdown}
        onRefreshWeather={onTriggerRefresh}
      />


      {/* Floating Map Controls */}
      <MapFloatingControls
        mapTypeId={mapTypeId}
        onChangeMapType={(type) => {
          setMapTypeId(type);
          if (map) map.setMapTypeId(type);
        }}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
      />

      {/* Radar Control & Legend Bar */}
      <RadarControlBar
        mapType={radarMapType}
        onSelectMapType={onChangeRadarMapType}
        opacity={radarOpacity}
        onChangeOpacity={onChangeRadarOpacity}
        visible={radarVisible}
        onToggleVisible={onToggleRadarVisible}
        onRefresh={onTriggerRefresh}
        onJumpRegion={handleJumpRegion}
        isSidebarCollapsed={isSidebarCollapsed}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={onToggleAutoRefresh}
        refreshCountdown={refreshCountdown}
      />
    </>
  );
}

export function WeatherMap(props: WeatherMapProps) {
  // Refined minimal light style for roadmap basemap
  const lightMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
    {
      featureType: 'administrative.country',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#cbd5e1' }, { weight: 1.2 }],
    },
    {
      featureType: 'administrative.province',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#e2e8f0' }, { weight: 0.8 }],
    },
    {
      featureType: 'landscape.man_made',
      elementType: 'geometry.fill',
      stylers: [{ color: '#f1f5f9' }],
    },
    {
      featureType: 'landscape.natural',
      elementType: 'geometry.fill',
      stylers: [{ color: '#f8fafc' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry.fill',
      stylers: [{ color: '#f0fdf4' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#64748b' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry.fill',
      stylers: [{ color: '#e2f7ea' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#e2e8f0' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#475569' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffedd5' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#fed7aa' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#f1f5f9' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry.fill',
      stylers: [{ color: '#bae6fd' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#0369a1' }],
    },
  ];

  return (
    <div className="relative w-full h-full min-h-[100vh] bg-slate-100 overflow-hidden">
      <Map
        id="google-weather-map-instance"
        defaultCenter={{ lat: props.selectedLocation.lat, lng: props.selectedLocation.lng }}
        defaultZoom={5}
        minZoom={2}
        maxZoom={16}
        disableDefaultUI={true}
        clickableIcons={false}
        gestureHandling="greedy"
        className="w-full h-full"
        styles={lightMapStyle}
        internalUsageAttributionIds={[
          'gmp_aistudio_weatherexplorer_v1.0.0',
          'gmp_mcp_codeassist_v1_aistudio',
        ]}
        {...({ internalAttributionIds: ['gmp_aistudio_weatherexplorer_v1.0.0'] } as any)}
      >
        <MapContent {...props} />
      </Map>
    </div>
  );
}
