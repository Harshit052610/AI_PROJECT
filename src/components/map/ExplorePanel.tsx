import React, { useState, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { LatLng } from '@/types/map';
import { usePlacesSearch, PlacePrediction } from '@/hooks/usePlacesSearch';
import L from 'leaflet';

interface ExplorePanelProps {
  map: L.Map | null;
  center: LatLng;
  isOpen: boolean;
  onClose: () => void;
  onPlaceSelect: (place: PlacePrediction) => void;
}

const CATEGORIES = [
  { id: 'police', label: 'Police Stations', icon: '👮', type: 'police' },
  { id: 'hospital', label: 'Hospitals', icon: '🏥', type: 'hospital' },
  { id: 'atm', label: 'ATMs', icon: '🏧', type: 'atm' },
  { id: 'pharmacy', label: 'Pharmacies', icon: '💊', type: 'pharmacy' },
  { id: 'cafe', label: 'Cafes', icon: '☕', type: 'cafe' },
  { id: 'gas_station', label: 'Petrol Pumps', icon: '⛽', type: 'gas_station' },
];

export const ExplorePanel: React.FC<ExplorePanelProps> = ({
  map,
  center,
  isOpen,
  onClose,
  onPlaceSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { searchNearby } = usePlacesSearch(map);

  const handleCategoryClick = useCallback(async (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category.id);
    setIsLoading(true);
    setPlaces([]);

    try {
      // searchNearby with Nominatim currently returns an empty array.
      // A more robust solution would involve integrating with a service like Overpass API.
      console.warn('searchNearby with Nominatim is not fully implemented yet. Displaying dummy data or empty results.');
      const results = await searchNearby(center, category.type, 3000);
      setPlaces(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  }, [center, searchNearby]);

  if (!isOpen) return null;

  return (
    <div className="absolute left-4 top-24 w-80 max-h-[70vh] glass-panel rounded-2xl overflow-hidden z-20 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-serif text-lg font-semibold">Explore Nearby</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {category.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="p-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : places.length > 0 ? (
          <div className="space-y-2">
            {places.map((place, index) => (
              <button
                key={place.placeId || index}
                onClick={() => onPlaceSelect(place)}
                className="w-full p-3 bg-secondary/50 hover:bg-secondary rounded-xl text-left transition-colors flex items-start gap-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{place.mainText}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {place.secondaryText}
                  </div>
                  {/* Rating and Open status are not directly available from Nominatim */}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : selectedCategory ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No places found nearby</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Select a category to explore</p>
          </div>
        )}
      </div>
    </div>
  );
};
