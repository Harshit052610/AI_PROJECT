import { useCallback, useState } from "react";
import { LatLng } from '@/types/map';
import { PlacePrediction } from '../hooks/usePlacesSearch'; // Import PlacePrediction

export interface PlaceDetailsExtended {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  // These fields are not directly available from Nominatim
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
  googleMapsUrl?: string;
  types?: string[];
  photos?: any[]; // No direct equivalent from Nominatim
}

export const usePlaceDetails = () => { // map parameter removed as it's not used for Nominatim
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaceDetails = useCallback(
    async (prediction: PlacePrediction): Promise<PlaceDetailsExtended | null> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!prediction) return null;

        const details: PlaceDetailsExtended = {
          placeId: prediction.placeId,
          name: prediction.mainText,
          address: prediction.description,
          location: { lat: prediction.lat, lng: prediction.lng },
          types: [], // Nominatim doesn't provide types in the same way as Google Places
          photos: [], // No direct equivalent
        };
        return details;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load place details");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { fetchPlaceDetails, isLoading, error };
};
