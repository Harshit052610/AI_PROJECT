import React from 'react';
import {
  Layers,
  Share2,
  Navigation,
  Plus,
  Minus,
  Ruler,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MapType, LayerType, MapState } from '@/types/map';

interface MapControlsProps {
  mapState: MapState;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGetLocation: () => void;
  onToggle3D: () => void;
  onMapTypeChange: (type: MapType) => void;
  onLayerToggle: (layer: LayerType) => void;
  onMeasure: () => void;
  onShare: () => void;
  showAccidentDots: boolean;
  onToggleAccidentDots: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  mapState,
  onZoomIn,
  onZoomOut,
  onGetLocation,
  onToggle3D,
  onMapTypeChange,
  onLayerToggle,
  onMeasure,
  onShare,
  showAccidentDots,
  onToggleAccidentDots,
}) => {
  const [showLayers, setShowLayers] = React.useState(false);

  return (
    <>
      {/* Left side controls - Layers */}
      <div className="absolute left-4 top-24 flex flex-col gap-2 z-10">
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowLayers(!showLayers)}
                className={`map-control-btn ${showLayers ? 'bg-secondary' : ''}`}
              >
                <Layers className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Layers</TooltipContent>
          </Tooltip>

          {showLayers && (
            <div className="absolute left-12 top-0 glass-panel rounded-xl p-3 min-w-[180px] animate-fade-in">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Map Type
              </div>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {(['roadmap'] as MapType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onMapTypeChange(type)}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors capitalize ${mapState.mapType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Layers
              </div>
              <div className="space-y-1">
                {/* Leaflet layers will be handled differently or removed if no direct equivalent */}
              </div>
            </div>
          )}
        </div>



        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onMeasure} className="map-control-btn">
              <Ruler className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Measure distance</TooltipContent>
        </Tooltip>
      </div>

      {/* Right side controls */}
      <div className="absolute right-4 top-24 flex flex-col gap-2 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleAccidentDots}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg active:scale-95 mb-1 ${showAccidentDots ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'bg-card border border-border/30 text-foreground/80 hover:bg-secondary'}`}
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Accident History Dots</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle3D}
              className={`map-control-btn ${mapState.is3D ? 'bg-secondary' : ''}`}
            >
              <span className="text-xs font-bold">3D</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Toggle 3D View</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onShare} className="map-control-btn">
              <Share2 className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Share</TooltipContent>
        </Tooltip>

        <div className="h-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onGetLocation} className="map-control-btn">
              <Navigation className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">My location</TooltipContent>
        </Tooltip>

        <div className="glass-panel rounded-full flex flex-col overflow-hidden">
          <button onClick={onZoomIn} className="p-2 hover:bg-secondary transition-colors" title="Zoom in">
            <Plus className="w-5 h-5" />
          </button>
          <div className="h-px bg-border" />
          <button onClick={onZoomOut} className="p-2 hover:bg-secondary transition-colors" title="Zoom out">
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};
