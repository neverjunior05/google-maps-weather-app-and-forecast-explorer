import { Plus, Minus, Crosshair, Map as MapIcon, Globe, Layers } from 'lucide-react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapFloatingControlsProps {
  mapTypeId: string;
  onChangeMapType: (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => void;
  onLocateUser: () => void;
  isLocating?: boolean;
}

export function MapFloatingControls({
  mapTypeId,
  onChangeMapType,
  onLocateUser,
  isLocating,
}: MapFloatingControlsProps) {
  const map = useMap();

  const handleZoomIn = () => {
    if (!map) return;
    const current = map.getZoom() || 5;
    map.setZoom(current + 1);
  };

  const handleZoomOut = () => {
    if (!map) return;
    const current = map.getZoom() || 5;
    map.setZoom(Math.max(1, current - 1));
  };

  // Map mode configuration for toggle-in-place cycling
  const mapModes: Array<{
    id: 'roadmap' | 'satellite' | 'terrain';
    label: string;
    nextType: 'roadmap' | 'satellite' | 'terrain';
    nextLabel: string;
    icon: typeof MapIcon;
  }> = [
    { id: 'roadmap', label: 'Default Map', nextType: 'satellite', nextLabel: 'Satellite', icon: MapIcon },
    { id: 'satellite', label: 'Satellite', nextType: 'terrain', nextLabel: 'Terrain', icon: Globe },
    { id: 'terrain', label: 'Terrain', nextType: 'roadmap', nextLabel: 'Default Map', icon: Layers },
  ];

  const currentMode = mapModes.find((m) => m.id === mapTypeId) || mapModes[0];
  const CurrentIcon = currentMode.icon;

  const handleToggleMapType = () => {
    onChangeMapType(currentMode.nextType);
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto select-none">
      {/* Map Style Toggle (In-Place) & Geolocation Container */}
      <div className="flex flex-col bg-white/95 border border-slate-200/90 rounded-2xl p-1 shadow-lg shadow-slate-200/50 backdrop-blur-md">
        {/* Toggle-in-place Map Mode Icon */}
        <button
          id="btn-map-type-toggle"
          onClick={handleToggleMapType}
          className="p-2 rounded-xl text-xs font-medium flex items-center justify-center transition-all bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-900 active:scale-95 cursor-pointer relative group"
          title={`Map View: ${currentMode.label} (Click to switch to ${currentMode.nextLabel})`}
          aria-label={`Current map style is ${currentMode.label}. Click to switch to ${currentMode.nextLabel}`}
        >
          <CurrentIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>

        <div className="h-px bg-slate-100 my-0.5" />

        <button
          id="btn-locate-user"
          onClick={onLocateUser}
          className={`p-2 rounded-xl text-xs font-medium flex items-center justify-center transition-all ${
            isLocating ? 'animate-spin text-sky-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Find My Location"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Minimal Zoom Controls */}
      <div className="flex flex-col bg-white/95 border border-slate-200/90 rounded-2xl p-1 shadow-lg shadow-slate-200/50 backdrop-blur-md">
        <button
          id="btn-zoom-in"
          onClick={handleZoomIn}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-100 my-0.5" />
        <button
          id="btn-zoom-out"
          onClick={handleZoomOut}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
