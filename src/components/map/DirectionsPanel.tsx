import React, { useState } from 'react';
import { X, Navigation, Clock, Shield, ChevronRight, Play, Square, Bike, Car } from 'lucide-react';
import { RouteInfo, NavigationState } from '@/types/map';

interface DirectionsPanelProps {
  navigationState: NavigationState;
  onSelectRoute: (index: number) => void;
  onStartNavigation: (mode: 'simulate' | 'real') => void;
  onStopNavigation: () => void;
  onClose: () => void;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  navigationState,
  onSelectRoute,
  onStartNavigation,
  onStopNavigation,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<'simulate' | 'real'>('simulate');
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);
  const { routes, selectedRoute, isNavigating, lastDirectionsStatus } = navigationState;

  if (routes.length === 0) {
    return (
      <div className="absolute left-4 top-24 w-80 max-h-[70vh] glass-panel rounded-2xl overflow-hidden z-20 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <span className="font-serif font-semibold">Commute</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          {lastDirectionsStatus ? (
            <div className="space-y-1">
              <div>No routes returned.</div>
              <div className="text-xs">LocationIQ status: <span className="font-mono">{lastDirectionsStatus}</span></div>
              <div className="text-xs">If you see <span className="font-mono">REQUEST_DENIED</span>, your API key restrictions/billing are blocking Directions.</div>
            </div>
          ) : (
            'Search and select a destination to see routes.'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-24 w-80 max-h-[70vh] glass-panel rounded-2xl overflow-hidden z-20 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <span className="font-serif font-semibold">Directions</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Routes */}
      <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {routes.length} route{routes.length !== 1 ? 's' : ''} available
        </div>

        {routes.map((route, index) => (
          <div key={route.id} className="relative">
            <button
              onClick={() => onSelectRoute(index)}
              onMouseEnter={() => setHoveredRoute(index)}
              onMouseLeave={() => setHoveredRoute(null)}
              className={`w-full p-3 rounded-xl text-left transition-all ${selectedRoute === index
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-secondary/50 border-2 border-transparent hover:border-primary/30'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">Route {index + 1}</span>
                {route.isFastest && (
                  <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Fastest</span>
                )}
                {typeof route.safetyScore === 'number' ? (
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-success" />
                    <span className="text-xs font-medium text-success">{route.safetyScore}% safe</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{route.duration}</span>
                </div>
                <span>•</span>
                <span>{route.distance}</span>
              </div>
            </button>

            {/* Hover Suggestion Card */}
            {hoveredRoute === index && (
              <div className="absolute left-full ml-3 top-0 w-64 glass-panel rounded-2xl shadow-elevated p-4 z-50 animate-fade-in border border-primary/20">
                <h4 className="font-serif font-bold text-[#8B7355] text-sm mb-3 border-bottom border-border pb-2 uppercase tracking-widest">Route Insights</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Efficiency</span>
                    <span className={route.isFastest ? "text-success font-bold" : "text-amber-600"}>
                      {route.isFastest ? "Optimal Speed" : "Slower Route"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Accident Risk</span>
                    <span className={route.accidentCount === 0 ? "text-success" : "text-destructive font-bold"}>
                      {route.accidentCount === 0 ? "Zero History" : `${route.accidentCount} Prone Areas`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Public Density</span>
                    <span className="text-foreground capitalize font-medium">{route.publicDensity} Density</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Safe Shops</span>
                    <span className="text-success font-medium">{route.shopCount} nearby</span>
                  </div>
                </div>
                <p className="mt-4 text-[10px] italic text-muted-foreground leading-tight border-t border-border pt-2">
                  {route.isFastest && route.accidentCount === 0
                    ? "Recommended: This is the fastest and safest path."
                    : route.accidentCount > 0
                      ? "Exercise caution: Historical data shows multiple incidents here."
                      : "Good alternative: Less traffic but slightly longer."}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Mode */}
      {!isNavigating && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Navigation Mode
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedMode('simulate')}
              className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${selectedMode === 'simulate'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
                }`}
            >
              <Bike className="w-4 h-4" />
              <span className="text-sm">Simulate</span>
            </button>
            <button
              onClick={() => setSelectedMode('real')}
              className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${selectedMode === 'real'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
                }`}
            >
              <Car className="w-4 h-4" />
              <span className="text-sm">Real GPS</span>
            </button>
          </div>

          <button
            onClick={() => onStartNavigation(selectedMode)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Play className="w-5 h-5" />
            Start Navigation
          </button>
        </div>
      )}

      {/* Active Navigation */}
      {isNavigating && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-4 text-success">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium">Navigation Active</span>
          </div>

          <button
            onClick={onStopNavigation}
            className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Square className="w-5 h-5" />
            Stop Navigation
          </button>
        </div>
      )}

      {/* Steps preview */}
      {routes[selectedRoute]?.steps && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Route Steps
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {routes[selectedRoute].steps.slice(0, 5).map((step, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <ChevronRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: step.instruction }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
