import { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import { MapState, LatLng, MapType, LayerType } from '@/types/map';

// Fix for default icon not showing in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/images/marker-icon-2x.png',
  iconUrl: 'leaflet/images/marker-icon.png',
  shadowUrl: 'leaflet/images/marker-shadow.png',
});

export const useLeafletMap = (mapContainerRef: React.RefObject<HTMLDivElement>) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    center: { lat: 16.5062, lng: 80.6480 }, // Vijayawada, India
    zoom: 14,
    mapType: 'roadmap', // This will be ignored for Leaflet, but kept for compatibility
    activeLayers: [],
    is3D: false, // Not directly supported by Leaflet, but kept for compatibility
    showLabels: true, // Not directly supported by Leaflet, but kept for compatibility
  });

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    console.log('useLeafletMap useEffect triggered');
    const container = mapContainerRef.current;
    if (!container) {
      console.log(`useLeafletMap: Map container ref is not attached to a DOM element.`);
      return;
    }
    console.log(`useLeafletMap: Map container ref found.`, container);

    // Initialize map only once
    if (!map) {
      console.log('useLeafletMap: Initializing new Leaflet map.');
      const leafletMap = L.map(container, { // Pass the DOM element directly
        center: [mapState.center.lat, mapState.center.lng],
        zoom: mapState.zoom,
        zoomControl: false, // We'll add custom controls
      });

      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap);

      setMap(leafletMap);
      console.log('useLeafletMap: Leaflet map initialized and set.', leafletMap);
    }

    return () => {
      console.log('useLeafletMap: Cleanup function triggered.');
      if (map) {
        map.remove();
        console.log('useLeafletMap: Map removed during cleanup.');
      }
    };
  }, [mapContainerRef, map]); // Dependency changed to mapContainerRef

  // Update map center and zoom
  useEffect(() => {
    if (map) {
      map.setView([mapState.center.lat, mapState.center.lng], mapState.zoom);
    }
  }, [map, mapState.center, mapState.zoom]);

  const setMapType = useCallback((type: MapType) => {
    // For Leaflet, we primarily use OpenStreetMap tiles.
    // This function can be extended to switch between different tile providers if needed.
    setMapState(prev => ({ ...prev, mapType: type }));
  }, []);

  const toggleLayer = useCallback((layer: LayerType) => {
    // Leaflet doesn't have direct equivalents for Google's traffic, transit, bike layers.
    // This function would need to be adapted to integrate with Leaflet-compatible layer plugins or custom data.
    setMapState(prev => {
      const isActive = prev.activeLayers.includes(layer);
      return {
        ...prev,
        activeLayers: isActive
          ? prev.activeLayers.filter(l => l !== layer)
          : [...prev.activeLayers, layer],
      };
    });
  }, []);

  const toggle3D = useCallback(() => {
    // Leaflet does not natively support 3D tilt like Google Maps.
    // This functionality would require a third-party plugin or a different approach.
    setMapState(prev => ({ ...prev, is3D: !prev.is3D }));
  }, []);

  const zoomIn = useCallback(() => {
    if (map) {
      map.zoomIn();
    }
  }, [map]);

  const zoomOut = useCallback(() => {
    if (map) {
      map.zoomOut();
    }
  }, [map]);

  const panTo = useCallback((position: LatLng) => {
    if (map) {
      map.panTo([position.lat, position.lng]);
    }
  }, [map]);

  const getCurrentLocation = useCallback(() => {
    if (!map || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.panTo([pos.lat, pos.lng]);
        map.setZoom(16);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }, [map]);

  // Street View is not available in Leaflet/OpenStreetMap
  const openStreetView = useCallback((position: LatLng) => {
    console.warn('Street View is not available with Leaflet/OpenStreetMap.');
  }, []);

  const closeStreetView = useCallback(() => {
    console.warn('Street View is not available with Leaflet/OpenStreetMap.');
  }, []);

  return {
    map,
    mapState,
    setMapType,
    toggleLayer,
    toggle3D,
    zoomIn,
    zoomOut,
    panTo,
    getCurrentLocation,
    openStreetView,
    closeStreetView,
  };
};
