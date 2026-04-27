import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Menu, Clock, MapPin } from 'lucide-react';
import { usePlacesSearch, PlacePrediction } from '@/hooks/usePlacesSearch';
import L from 'leaflet';

interface SearchBarProps {
  map: L.Map | null;
  onPlaceSelect: (place: PlacePrediction) => void;
  onMenuClick: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  map,
  onPlaceSelect,
  onMenuClick,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { predictions, isSearching, recentSearches, search, selectPrediction, clearSearch } =
    usePlacesSearch(map);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search, clearSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (prediction: PlacePrediction) => {
    await selectPrediction(prediction);
    setQuery(prediction.mainText);
    setIsFocused(false);
    onPlaceSelect(prediction);
  };

  const handleClear = () => {
    setQuery('');
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-10">
      <div
        className={`glass-panel rounded-full flex items-center px-4 py-2 transition-all duration-300 ${isFocused ? 'shadow-elevated ring-2 ring-primary/20' : 'shadow-control'
          }`}
      >
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-secondary rounded-full transition-colors"
          title="Menu"
        >
          <Menu className="w-5 h-5 text-foreground/70" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for places, addresses, or businesses..."
          className="search-input flex-1 px-4 py-2 text-sm"
        />

        {query && (
          <button
            onClick={handleClear}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Clear"
          >
            <X className="w-5 h-5 text-foreground/70" />
          </button>
        )}

        <div className="w-px h-6 bg-border mx-1" />



        <button className="p-2 hover:bg-secondary rounded-full transition-colors" title="Search">
          <Search className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Dropdown */}
      {isFocused && (predictions.length > 0 || (query.length === 0 && recentSearches.length > 0)) && (
        <div className="glass-panel mt-2 rounded-2xl overflow-hidden animate-slide-up">
          {query.length === 0 && recentSearches.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Searches
              </div>
              {recentSearches.map((item) => (
                <button
                  key={item.placeId}
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{item.mainText}</div>
                    <div className="text-xs text-muted-foreground">{item.secondaryText}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelect(prediction)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
            >
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">{prediction.mainText}</div>
                <div className="text-xs text-muted-foreground">{prediction.secondaryText}</div>
              </div>
            </button>
          ))}

          {isSearching && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
