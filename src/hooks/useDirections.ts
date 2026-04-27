import { useState, useCallback, useRef, useEffect } from 'react';
import L from 'leaflet';
import { LatLng, RouteInfo, NavigationState } from '@/types/map';

export const useDirections = (map: L.Map | null) => {
  const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM4ZTNiZTBhYTNkYzRmMzJiNDVhMWQ4NjljYThkYjE5IiwiaCI6Im11cm11cjY0In0='; // Replace with your ORS API key

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
      if (!ORS_API_KEY || ORS_API_KEY === 'YOUR_OPENROUTESERVICE_API_KEY') {
        console.error('OpenRouteService API key is not set.');
        return { routes: [], status: 'API_KEY_MISSING' };
      }

      const profile = travelMode.toLowerCase(); // ORS profiles are lowercase (e.g., 'driving-car')
      const coordinates = `${origin.lng},${origin.lat}|${destination.lng},${destination.lat}`;
      const apiUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, application/x-protobuf',
            'Content-Type': 'application/json',
            'Authorization': ORS_API_KEY,
          },
          body: JSON.stringify({
            coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error('ORS API error:', errorBody);
          return { routes: [], status: `ORS_ERROR: ${errorBody.error.message}` };
        }

        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const routeFeature = data.features[0];
          const routeCoordinates = routeFeature.geometry.coordinates.map((coord: [number, number]) => ({
            lng: coord[0],
            lat: coord[1],
          }));

          // Convert ORS polyline to Leaflet LatLng array
          const leafletPolyline: LatLng[] = routeCoordinates.map((coord: LatLng) => ({
            lat: coord.lat,
            lng: coord.lng,
          }));

          // Dummy values for now, will refine later
          const distance = (routeFeature.properties.summary.distance / 1000).toFixed(1) + ' km';
          const duration = Math.round(routeFeature.properties.summary.duration / 60) + ' min';

          const routes: RouteInfo[] = [{
            id: 'ors-route-1',
            distance: distance,
            duration: duration,
            safetyScore: 80, // Placeholder
            polyline: leafletPolyline,
            steps: [], // ORS provides detailed steps, need to parse them
            accidentCount: 0, // Placeholder
            shopCount: 0, // Placeholder
            publicDensity: 'Medium', // Placeholder
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
            routePolylineRef.current = L.polyline(leafletPolyline.map(p => [p.lat, p.lng]), { color: '#1A73E8', weight: 5, opacity: 0.85 }).addTo(map);
            map.fitBounds(routePolylineRef.current.getBounds());
          }

          return { routes };
        }
        return { routes: [], status: 'NO_ROUTES_FOUND' };
      } catch (error) {
        console.error('Error fetching ORS directions:', error);
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
      }, 500);
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

            if (currentMarkerRef.current) {
              currentMarkerRef.current.setLatLng([pos.lat, pos.lng]);
            } else if (map) {
              currentMarkerRef.current = L.marker([pos.lat, pos.lng]).addTo(map);
            }

            map?.panTo([pos.lat, pos.lng]);

            setNavigationState((prev) => ({
              ...prev,
              currentPosition: pos,
            }));
          },
          (error) => console.error('GPS Error:', error),
          { enableHighAccuracy: true, maximumAge: 0 }
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
