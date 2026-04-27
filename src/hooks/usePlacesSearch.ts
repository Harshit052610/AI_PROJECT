import { useState, useCallback, useRef, useEffect } from 'react';
import { LatLng } from '@/types/map';
import L from 'leaflet';

export interface PlacePrediction {
  placeId: string; // Using Nominatim's osm_id as placeId
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

export interface PlaceDetails {
  name: string;
  address: string;
  position: LatLng;
  placeId: string;
  types: string[];
  rating?: number; // Not directly available from Nominatim
  isOpen?: boolean; // Not directly available from Nominatim
}

export const usePlacesSearch = (map: L.Map | null) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<PlacePrediction[]>([]);

  // Initialize services - no specific services needed for Nominatim beyond fetch
  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Search for places using Nominatim
  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);

    try {
      console.log(`Nominatim: Searching for query: "${query}"`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`
      );
      console.log('Nominatim: API response received.', response);
      const results = await response.json();
      console.log('Nominatim: Parsed JSON results.', results);

      if (results && results.length > 0) {
        setPredictions(
          results.map((r: any) => ({
            placeId: r.osm_id.toString(), // Using osm_id as a unique identifier
            description: r.display_name,
            mainText: r.name || r.address.road || r.display_name.split(',')[0],
            secondaryText: r.display_name.split(',').slice(1).join(',').trim(),
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          }))
        );
      } else {
        setPredictions([]);
      }
      setIsSearching(false);
    } catch (error) {
      console.error('Nominatim search error:', error);
      setPredictions([]);
      setIsSearching(false);
    }
  }, []);

  // Get place details - Nominatim search results are usually detailed enough
  const getPlaceDetails = useCallback(async (prediction: PlacePrediction): Promise<PlaceDetails | null> => {
    if (!prediction) return null;

    const details: PlaceDetails = {
      name: prediction.mainText,
      address: prediction.description,
      position: { lat: prediction.lat, lng: prediction.lng },
      placeId: prediction.placeId,
      types: [], // Nominatim doesn't provide types in the same way as Google Places
    };
    return details;
  }, []);

  // Select a prediction
  const selectPrediction = useCallback(async (prediction: PlacePrediction) => {
    const details = await getPlaceDetails(prediction);
    
    // Save to recent searches
    setRecentSearches((prev) => {
      const updated = [prediction, ...prev.filter((p) => p.placeId !== prediction.placeId)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });

    setPredictions([]);
    return details;
  }, [getPlaceDetails]);

  // Clear search
  const clearSearch = useCallback(() => {
    setPredictions([]);
  }, []);

  // Search nearby places by type - Not directly supported by Nominatim in the same way
  const searchNearby = useCallback(async (
    position: LatLng,
    type: string,
    radius: number = 2000
  ): Promise<PlaceDetails[]> => {
    console.warn('Nominatim does not support "searchNearby" by type directly. Returning empty array.');
    return [];
  }, []);

  return {
    predictions,
    isSearching,
    recentSearches,
    search,
    selectPrediction,
    clearSearch,
    getPlaceDetails,
    searchNearby,
  };
};
