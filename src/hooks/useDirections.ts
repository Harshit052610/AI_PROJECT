import { useState, useCallback, useRef, useEffect } from 'react';
import L from 'leaflet';
import { LatLng, RouteInfo, NavigationState } from '@/types/map';

export const useDirections = (map: L.Map | null) => {
  const LOCATIONIQ_API_KEY = 'pk.ef423b51534f51549c9d54f6fbd88d65'; // Your LocationIQ API key

  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    mode: 'simulate',
    currentPosition: null,
    destination: null,
    routes: [],
    selectedRoute: 0,
  });

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const routeIndexRef = useRef(0);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null); // To store the drawn route

  // Get directions - Placeholder for Leaflet routing
  const getDirections = useCallback(
    async (
      origin: LatLng,
      destination: LatLng,
      travelMode: string = 'DRIVING', // travelMode is now a string
      accidentZones: any[] = [],
      safeShops: any[] = []
    ): Promise<{ routes: RouteInfo[]; status?: string }> => {
      if (!LOCATIONIQ_API_KEY || LOCATIONIQ_API_KEY === 'YOUR_LOCATIONIQ_API_KEY') {
        console.error('LocationIQ API key is not set.');
        return { routes: [], status: 'API_KEY_MISSING' };
      }

      const profile = travelMode.toLowerCase() === 'walking' ? 'walking' : 
                      travelMode.toLowerCase() === 'bicycling' ? 'cycling' : 'driving';
      const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      // Updated URL format to match LocationIQ documentation: https://us1.locationiq.com/v1/directions/{profile}/{coordinates}
      const apiUrl = `https://us1.locationiq.com/v1/directions/${profile}/${coordinates}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=geojson&steps=true`;
      console.log('LocationIQ API URL:', apiUrl);

      try {
        const response = await fetch(apiUrl);
        console.log('LocationIQ raw response:', response);

        if (!response.ok) {
          const errorBody = await response.json();
          console.error('LocationIQ API error:', errorBody);
          return { routes: [], status: `LOCATIONIQ_ERROR: ${errorBody.error || errorBody.message}` };
        }

        const data = await response.json();
        console.log('LocationIQ raw data:', data);
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // When using geometries=geojson, route.geometry.coordinates is an array of [lng, lat]
          const leafletPolyline: LatLng[] = route.geometry.coordinates.map((coord: [number, number]) => ({
            lat: coord[1],
            lng: coord[0],
          }));

          const distanceFormatted = (route.distance / 1000).toFixed(1) + ' km';
          const durationFormatted = Math.round(route.duration / 60) + ' min';

          // Extract steps if available
          const steps = route.legs?.[0]?.steps?.map((step: any) => ({
            instruction: step.maneuver?.instruction || 'Continue',
            distance: step.distance,
            duration: step.duration,
          })) || [];

          const routes: RouteInfo[] = [{
            id: `locationiq-route-${Date.now()}`,
            distance: distanceFormatted,
            duration: durationFormatted,
            safetyScore: 85, // Default base score
            polyline: leafletPolyline,
            steps: steps,
            accidentCount: accidentZones.length > 0 ? 0 : 0, // Should calculate based on polyline intersection
            shopCount: safeShops.length,
            publicDensity: 'Medium',
            isFastest: true,
          }];

          setNavigationState((prev) => ({
            ...prev,
            routes,
            destination,
            selectedRoute: 0,
            lastDirectionsStatus: undefined,
          }));

          // Draw polyline on map
          if (map) {
            if (routePolylineRef.current) {
              map.removeLayer(routePolylineRef.current);
            }
            routePolylineRef.current = L.polyline(leafletPolyline.map(p => [p.lat, p.lng]), { 
              color: '#1A73E8', 
              weight: 6, 
              opacity: 0.8,
              lineJoin: 'round'
            }).addTo(map);
            map.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
          }

          return { routes };
        }
        return { routes: [], status: 'NO_ROUTES_FOUND' };
      } catch (error) {
        console.error('Error fetching LocationIQ directions:', error);
        return { routes: [], status: `FETCH_ERROR: ${error}` };
      }
    },
    [map]
  );

  // Select a route
  const selectRoute = useCallback((index: number) => {
    // With ORS, we typically get one main route. This can be extended if ORS provides alternatives.
    setNavigationState((prev) => ({ ...prev, selectedRoute: index }));
  }, []);

  // Start navigation
  const startNavigation = useCallback((mode: 'simulate' | 'real') => {
    const { routes, selectedRoute } = navigationState;
    if (routes.length === 0 || !map) return;

    const route = routes[selectedRoute];
    routeIndexRef.current = 0;

    setNavigationState((prev) => ({
      ...prev,
      isNavigating: true,
      mode,
      currentPosition: route.polyline.length > 0 ? {
        lat: route.polyline[0].lat,
        lng: route.polyline[0].lng,
      } : null,
    }));

    if (map && route.polyline.length > 0) {
      const start = route.polyline[0];
      map.panTo([start.lat, start.lng]);
      map.setZoom(18);
    }

    if (mode === 'simulate') {
      simulationIntervalRef.current = setInterval(() => {
        routeIndexRef.current++;
        const polyline = route.polyline;

        if (routeIndexRef.current >= polyline.length) {
          stopNavigation();
          return;
        }

        const position = polyline[routeIndexRef.current];

        if (currentMarkerRef.current) {
          currentMarkerRef.current.setLatLng([position.lat, position.lng]);
        } else if (map) {
          currentMarkerRef.current = L.marker([position.lat, position.lng]).addTo(map);
        }

        map?.panTo([position.lat, position.lng]);

        setNavigationState((prev) => ({
          ...prev,
          currentPosition: position,
        }));
      }, 100);
    } else {
      // Real GPS tracking
      if (navigator.geolocation) {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            console.log('Real Nav Position:', pos);

            if (currentMarkerRef.current) {
              currentMarkerRef.current.setLatLng([pos.lat, pos.lng]);
            } else if (map) {
              const icon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#4285F4;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);'></div>",
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });
              currentMarkerRef.current = L.marker([pos.lat, pos.lng], { icon }).addTo(map);
            }

            map?.setView([pos.lat, pos.lng], map.getZoom() || 18);

            setNavigationState((prev) => ({
              ...prev,
              currentPosition: pos,
            }));
          },
          (error) => {
            console.error('GPS Error:', error);
            // We could use an event emitter or callback here to show a toast in UI
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }
  }, [navigationState, map]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    currentMarkerRef.current?.remove();
    currentMarkerRef.current = null;

    if (map && routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    setNavigationState((prev) => ({
      ...prev,
      isNavigating: false,
      currentPosition: null,
    }));
  }, [map]);

  // Clear route
  const clearRoute = useCallback(() => {
    stopNavigation();
    if (map && routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    setNavigationState({
      isNavigating: false,
      mode: 'simulate',
      currentPosition: null,
      destination: null,
      routes: [],
      selectedRoute: 0,
    });
  }, [stopNavigation, map]);

  return {
    navigationState,
    getDirections,
    selectRoute,
    startNavigation,
    stopNavigation,
    clearRoute,
  };
};
