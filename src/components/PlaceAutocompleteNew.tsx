/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, Search } from 'lucide-react';
import { WeatherLocation } from '../types/weather';

interface PlaceAutocompleteNewProps {
  onSelectLocation: (loc: WeatherLocation) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
  alignDropdown?: 'left' | 'right' | 'auto';
}

/**
 * Places UI Kit Basic Autocomplete Component
 * Conforms to Google Maps Platform Places UI Kit specification:
 * https://developers.google.com/maps/documentation/javascript/places-ui-kit/basic-autocomplete
 * Uses <gmp-basic-place-autocomplete> / google.maps.places.BasicPlaceAutocompleteElement
 */
export function PlaceAutocompleteNew({
  onSelectLocation,
  placeholder = 'Search location...',
  className = '',
  onFocusChange,
}: PlaceAutocompleteNewProps) {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!placesLib || !containerRef.current) return;

    // Retrieve Places UI Kit BasicPlaceAutocompleteElement (or PlaceAutocompleteElement)
    const AutocompleteClass =
      (placesLib as any).BasicPlaceAutocompleteElement ||
      (placesLib as any).PlaceAutocompleteElement;

    if (!AutocompleteClass) {
      console.warn('BasicPlaceAutocompleteElement is not available in google.maps.places');
      return;
    }

    const autocomplete = new AutocompleteClass();

    if (placeholder) {
      try {
        autocomplete.placeholder = placeholder;
      } catch {}
      autocomplete.setAttribute('placeholder', placeholder);
    }

    const handleSelect = async (event: any) => {
      try {
        let place = event.place;
        if (!place && event.placePrediction) {
          place = await event.placePrediction.toPlace();
        }
        if (!place) return;

        // Fetch location and display attributes from the Places UI Kit Place object
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport', 'id'],
        });

        const lat =
          typeof place.location?.lat === 'function'
            ? place.location.lat()
            : place.location?.lat;
        const lng =
          typeof place.location?.lng === 'function'
            ? place.location.lng()
            : place.location?.lng;

        if (lat !== undefined && lng !== undefined) {
          const name = place.displayName || place.formattedAddress || 'Selected Location';
          onSelectLocation({
            id: `place-${place.id || Date.now()}`,
            name: typeof name === 'string' ? name : String(name),
            country: '',
            lat: Number(lat),
            lng: Number(lng),
          });
          onFocusChange?.(false);
        }
      } catch (err) {
        console.error('Error in Places UI Kit Autocomplete selection:', err);
      }
    };

    const handleError = (err: any) => {
      console.warn('Places UI Kit Autocomplete error event:', err);
    };

    const handleFocusIn = () => onFocusChange?.(true);
    const handleFocusOut = () => onFocusChange?.(false);

    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('gmp-error', handleError);
    autocomplete.addEventListener('focusin', handleFocusIn);
    autocomplete.addEventListener('focusout', handleFocusOut);

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(autocomplete);
    setIsReady(true);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocomplete.removeEventListener('gmp-error', handleError);
      autocomplete.removeEventListener('focusin', handleFocusIn);
      autocomplete.removeEventListener('focusout', handleFocusOut);
      if (autocomplete.parentNode) {
        autocomplete.parentNode.removeChild(autocomplete);
      }
    };
  }, [placesLib, onSelectLocation, onFocusChange, placeholder]);

  return (
    <div className={`places-ui-kit-wrapper relative w-full ${className}`}>
      {!isReady && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate">{placeholder}</span>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500 ml-auto" />
        </div>
      )}
      <div
        ref={containerRef}
        className={`w-full ${!isReady ? 'hidden' : 'block'}`}
      />
    </div>
  );
}
