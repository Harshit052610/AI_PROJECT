import { useState, useCallback, useRef, useEffect } from 'react';

// Simple debounce utility
const debounce = (func: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};
import { LatLng } from '@/types/map';
import L from 'leaflet';

export interface PlacePrediction {
  placeId: string; // Using ORS's gid as placeId
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
  rating?: number; // Not directly available from ORS Geocoding
  isOpen?: boolean; // Not directly available from ORS Geocoding
}

export const usePlacesSearch = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<PlacePrediction[]>([]);

  // Initialize services - no specific services needed for ORS Geocoding beyond fetch
  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Search for places using ORS Geocoding
  const search = useCallback(
    debounce(async (query: string): Promise<void> => {
      if (!query.trim()) {
        setPredictions([]);
        return;
      }

      setIsSearching(true);

      try {
      const LOCATIONIQ_API_KEY = 'pk.ef423b51534f51549c9d54f6fbd88d65';
        console.log(`LocationIQ: Searching for query: "${query}"`);
        const response = await fetch(
          `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=5`
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('LocationIQ API error:', response.status, errorText);
          setPredictions([]);
          setIsSearching(false);
          return;
        }

        console.log('LocationIQ: API response received.', response);
        const results = await response.json();
        console.log('LocationIQ: Parsed JSON results.', results);

        if (results && Array.isArray(results) && results.length > 0) {
          setPredictions(
            results.map((r: any) => ({
              placeId: r.place_id,
              description: r.display_name,
              mainText: r.name || (r.address ? r.address.road : null) || r.display_name.split(',')[0],
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
        console.error('ORS search error:', error);
        setPredictions([]);
        setIsSearching(false);
      }
    }, 300), // 300ms debounce delay
    []
  )

  // Get place details - ORS Geocoding results are usually detailed enough
  const getPlaceDetails = useCallback(async (prediction: PlacePrediction): Promise<PlaceDetails | null> => {
    if (!prediction) return null;

    const details: PlaceDetails = {
      name: prediction.mainText,
      address: prediction.description,
      position: { lat: prediction.lat, lng: prediction.lng },
      placeId: prediction.placeId,
      types: [], // ORS Geocoding doesn't provide types in the same way as Google Places
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

  // Search nearby places by type - Not directly supported by ORS Geocoding in the same way
  const searchNearby = useCallback(async (
    position: LatLng,
    type: string,
    radius: number = 2000
  ): Promise<PlaceDetails[]> => {
    console.warn('ORS Geocoding does not support "searchNearby" by type directly. Returning empty array.');
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
