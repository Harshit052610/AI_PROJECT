import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDirections } from '@/hooks/useDirections';
import { useFirebaseRadar } from '@/hooks/useFirebaseRadar';
import { SearchBar } from '@/components/map/SearchBar';
import { MapControls } from '@/components/map/MapControls';
import { BottomNav } from '@/components/map/BottomNav';
import { RadarScanner } from '@/components/map/RadarScanner';
import { SafeShopsLayer } from '@/components/map/SafeShopsLayer';
import { DirectionsPanel } from '@/components/map/DirectionsPanel';
import { VoiceAssistant } from '@/components/map/VoiceAssistant';
import { SOSButton } from '@/components/map/SOSButton';
import { ExplorePanel } from '@/components/map/ExplorePanel';
import { MeasurementTool } from '@/components/map/MeasurementTool';
import { WeatherLayer } from '@/components/map/WeatherLayer';
import { SideMenu } from '@/components/map/SideMenu';
import { PlaceDetailsSheet, TravelModeOption } from '@/components/map/PlaceDetailsSheet';
import { PlacePrediction } from '@/hooks/usePlacesSearch';
import { RoutePlannerDialog } from '@/components/map/RoutePlannerDialog';
import { ProximityWarning } from '@/components/map/ProximityWarning';
import { AccidentDotsLayer } from '@/components/map/AccidentDotsLayer';
import { useAccidentZones } from '@/hooks/useAccidentZones';
import { LatLng } from '@/types/map';
import { Loader2 } from 'lucide-react';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [activeNav, setActiveNav] = useState<NavItem>('explore');
  const [showRadar, setShowRadar] = useState(false);
  const [showSafeShops, setShowSafeShops] = useState(true);
  const [showDirections, setShowDirections] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlacePrediction | null>(null);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showAccidentDots, setShowAccidentDots] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const {
    map,
    mapState,
    setMapType,
    toggleLayer,
    toggle3D,
    zoomIn,
    zoomOut,
    getCurrentLocation,
    openStreetView,
  } = useLeafletMap(mapContainerRef);

  const {
    navigationState,
    getDirections,
    selectRoute,
    startNavigation,
    stopNavigation,
    clearRoute,
  } = useDirections(map);

  const { zones, loading: loadingZones } = useAccidentZones();

  const { triggerSOS } = useFirebaseRadar();

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to Vijayawada if geolocation fails
          setCurrentPosition({ lat: 16.5062, lng: 80.6480 });
        }
      );
    }
  }, []);

  // Handle place selection
  const handlePlaceSelect = useCallback(
    async (place: PlacePrediction) => {
      if (!map) return;

      setSelectedPlace(place);
      setShowPlaceDetails(true);

      map.panTo([place.lat, place.lng]);
      map.setZoom(17);

      // Add marker (will be handled by a Leaflet-specific component later)

      // Open commute panel (even before routes, it will show helper text)
      setShowDirections(true);

      // Default: fetch driving routes immediately (Walk/Bike/Car can be chosen in Place Details)
      if (currentPosition) {
        const res = await getDirections(
          currentPosition,
          { lat: place.lat, lng: place.lng },
          'DRIVING',
          zones // pass accident zones for safety checking
        );
        if (res.routes.length > 0) {
          toast({
            title: 'Routes Found',
            description: `Found ${res.routes.length} route${res.routes.length > 1 ? 's' : ''} to ${place.mainText}`,
          });
        } else if (res.status) {
          toast({
            title: 'No routes found',
            description: `LocationIQ status: ${res.status}`,
          });
        }
      }
    },
    [map, currentPosition, getDirections]
  );

  // Handle nav item click
  const handleNavClick = useCallback((item: NavItem) => {
    setActiveNav(item);

    switch (item) {
      case 'explore':
        setShowExplore(true);
        break;
      case 'commute':
        setShowDirections(true);
        if (navigationState.routes.length === 0) {
          toast({
            title: 'Commute',
            description: 'Search and select a destination to see routes.',
          });
        }
        break;
      case 'contribute':
        toast({ title: 'Contribute feature coming soon!' });
        break;
      case 'updates':
        toast({ title: 'No new updates' });
        break;
    }
  }, [navigationState.routes.length]);


  // Handle share
  const handleShare = useCallback(() => {
    const center = map?.getCenter();
    if (center && navigator.share) {
      navigator.share({
        title: 'Check out this location',
        url: `https://www.google.com/maps?q=${center.lat},${center.lng}`,
      });
    } else if (center) {
      navigator.clipboard.writeText(
        `https://www.google.com/maps?q=${center.lat},${center.lng}`
      );
      toast({ title: 'Link copied to clipboard!' });
    }
  }, [map]);

  // Handle Street View
  const handleStreetView = useCallback(() => {
    toast({
      title: 'Street View Unavailable',
      description: 'Street View is not available with OpenStreetMap/Leaflet.',
    });
  }, []);

  // Handle SOS
  const handleSOS = useCallback(() => {
    triggerSOS('current-user');
    toast({
      title: '🆘 SOS Alert Sent',
      description: 'Emergency contacts have been notified',
      variant: 'destructive',
    });
  }, [triggerSOS]);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} id="map-container" className="h-full w-full z-0" />

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-20">
        <SearchBar
          map={map}
          onPlaceSelect={handlePlaceSelect}
          onMenuClick={() => setShowMenu(true)}
          onVoiceSearch={() => { }}
        />
      </div>

      {/* Map Controls */}
      <MapControls
        mapState={mapState}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onGetLocation={getCurrentLocation}
        onToggle3D={toggle3D}
        onMapTypeChange={setMapType}
        onLayerToggle={toggleLayer}
        onMeasure={() => setShowMeasure((prev) => !prev)}
        onShare={handleShare}
        showAccidentDots={showAccidentDots}
        onToggleAccidentDots={() => {
          setShowAccidentDots(prev => !prev);
          toast({ title: showAccidentDots ? 'Dots Hidden' : 'Dots Visible' });
        }}
      />

      {/* Bottom Navigation */}
      <BottomNav activeItem={activeNav} onItemClick={handleNavClick} />

      {/* Radar Scanner */}
      <RadarScanner
        map={map}
        isVisible={showRadar}
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
      />

      {/* Safe Shops Layer */}
      <SafeShopsLayer
        map={map}
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
        isVisible={showSafeShops}
        routePath={navigationState.routes[navigationState.selectedRoute]?.polyline}
      />

      {/* Directions Panel */}
      {showDirections && (
        <DirectionsPanel
          navigationState={navigationState}
          onSelectRoute={selectRoute}
          onStartNavigation={startNavigation}
          onStopNavigation={stopNavigation}
          onClose={() => {
            setShowDirections(false);
            clearRoute();
          }}
        />
      )}

      {/* Explore Panel */}
      <ExplorePanel
        map={map}
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
        isOpen={showExplore}
        onClose={() => setShowExplore(false)}
        onPlaceSelect={handlePlaceSelect}
      />

      {/* Measurement Tool */}
      <MeasurementTool
        map={map}
        isActive={showMeasure}
        onClose={() => setShowMeasure(false)}
      />

      {/* Weather Layer */}
      <WeatherLayer
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
        isVisible={showWeather}
      />

      {/* Place Details */}
      <PlaceDetailsSheet
        place={selectedPlace}
        isOpen={showPlaceDetails}
        onClose={() => setShowPlaceDetails(false)}
        onStartDirections={async (mode: TravelModeOption) => {
          if (!currentPosition || !selectedPlace) {
            toast({ title: 'Location unavailable', description: 'Turn on GPS to start directions.' });
            return;
          }
          const travelMode =
            mode === 'WALKING'
              ? 'WALKING'
              : mode === 'BICYCLING'
                ? 'BICYCLING'
                : 'DRIVING';

          const primary = await getDirections(
            currentPosition,
            { lat: selectedPlace.lat, lng: selectedPlace.lng },
            travelMode,
            zones
          );
          setShowDirections(true);

          // If WALKING/BICYCLING returns no routes (very common coverage issue), fallback to DRIVING so you always get a path.
          if (primary.routes.length === 0 && travelMode !== 'DRIVING') {
            const fallback = await getDirections(
              currentPosition,
              { lat: selectedPlace.lat, lng: selectedPlace.lng },
              'DRIVING',
              zones
            );

            if (fallback.routes.length > 0) {
              toast({
                title: 'Route fallback',
                description: 'Walk/Bike routes unavailable here. Showing car route instead.',
              });
              return;
            }
          }

          if (primary.routes.length === 0) {
            toast({
              title: 'No routes found',
              description: primary.status ? `LocationIQ status: ${primary.status}` : 'Try a different destination.',
            });
          }
        }}
      />

      {/* SOS Button */}
      <SOSButton currentPosition={currentPosition} onTriggerSOS={handleSOS} />

      {/* Side Menu */}
      <SideMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />

      {/* Radar Toggle Button */}
      <button
        onClick={() =>
          setShowRadar((prev) => {
            const next = !prev;
            toast({ title: next ? 'Scanning…' : 'Radar disabled' });
            return next;
          })
        }
        className={`absolute left-4 top-[280px] map-control-btn z-10 ${showRadar ? 'bg-primary text-primary-foreground' : ''
          }`}
        title="Toggle Radar Scanner"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
          <line x1="12" y1="2" x2="12" y2="12" className={showRadar ? 'radar-scan' : ''} style={{ transformOrigin: '12px 12px' }} />
        </svg>
      </button>

      {/* Weather Toggle Button */}
      <button
        onClick={() => setShowWeather((prev) => !prev)}
        className={`absolute left-4 top-[324px] map-control-btn z-10 ${showWeather ? 'bg-primary text-primary-foreground' : ''
          }`}
        title="Toggle Weather"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>

      {/* Safe Shops Toggle Button */}
      <button
        onClick={() => setShowSafeShops((prev) => !prev)}
        className={`absolute left-4 top-[368px] map-control-btn z-10 ${showSafeShops ? 'bg-success text-success-foreground' : ''
          }`}
        title="Toggle Safe Shops"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M9 8h6M9 12h6M9 16h6M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        </svg>
      </button>


      {/* Route Planner Button */}
      <button
        onClick={() => setShowRoutePlanner(true)}
        className="absolute left-4 top-[412px] map-control-btn z-10"
        title="Plan Route"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 6H6a2 2 0 0 0-2 2v12l7-3 7 3V8a2 2 0 0 0-2-2h-4" />
          <path d="M10 6a2 2 0 0 1 4 0v4h-4V6z" />
        </svg>
      </button>

      <AccidentDotsLayer
        map={map}
        isVisible={showAccidentDots}
        zones={zones}
      />

      <ProximityWarning
        map={map}
        currentPosition={navigationState.currentPosition || currentPosition}
        zones={zones}
      />

      {/* Radar Scanner */}
      <RadarScanner
        map={map}
        isVisible={showRadar}
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
      />

      {/* Safe Shops Layer */}
      <SafeShopsLayer
        map={map}
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
        isVisible={showSafeShops}
        routePath={navigationState.routes[navigationState.selectedRoute]?.polyline}
      />

      {/* Weather Layer */}
      <WeatherLayer
        center={currentPosition || { lat: 16.5062, lng: 80.6480 }}
        isVisible={showWeather}
      />

      {loadingZones && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-[#C5A880]/20 z-50 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-[#C5A880] animate-spin" />
          <span className="text-[10px] text-[#C5A880] font-serif uppercase tracking-widest">Scanning History...</span>
        </div>
      )}

      <RoutePlannerDialog
        map={map}
        isOpen={showRoutePlanner}
        onClose={() => setShowRoutePlanner(false)}
        currentPosition={currentPosition}
        onPlanRoute={async ({ origin, destination, mode }) => {
          const travelMode =
            mode === 'WALKING'
              ? 'WALKING'
              : mode === 'BICYCLING'
                ? 'BICYCLING'
                : 'DRIVING';

          const primary = await getDirections(origin, destination, travelMode, zones);
          setShowDirections(true);

          if (primary.routes.length === 0 && travelMode !== 'DRIVING') {
            const fallback = await getDirections(origin, destination, 'DRIVING');
            if (fallback.routes.length > 0) {
              toast({ title: 'Route fallback', description: 'Walk/Bike routes unavailable here. Showing car route instead.' });
              startNavigation('simulate');
              return;
            }
          }

          if (primary.routes.length === 0) {
            toast({
              title: 'No routes found',
              description: primary.status ? `LocationIQ status: ${primary.status}` : 'Try a different destination.',
            });
            return;
          }

          toast({
            title: 'Route planned',
            description: 'Choose your navigation mode and click Start.',
          });
        }}
      />
    </div>
  );
};

export default Index;
