import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { SafeShop, LatLng } from '@/types/map';
import { usePlacesSearch } from '@/hooks/usePlacesSearch';

interface SafeShopsLayerProps {
  map: L.Map | null;
  center: LatLng;
  isVisible: boolean;
  routePath?: LatLng[];
}

const SHOP_TYPES = ['police', 'hospital', 'pharmacy', 'cafe', 'convenience_store'];

export const SafeShopsLayer: React.FC<SafeShopsLayerProps> = ({
  map,
  center,
  isVisible,
  routePath,
}) => {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { searchNearby } = usePlacesSearch(map);

  const getShopIcon = (type: string): L.DivIcon => {
    let emoji = '📍';
    let color = '#8B7355'; // Default color

    switch (type) {
      case 'police':
        emoji = '👮';
        color = '#3B82F6';
        break;
      case 'hospital':
        emoji = '🏥';
        color = '#EF4444';
        break;
      case 'pharmacy':
        emoji = '💊';
        color = '#22C55E';
        break;
      case 'cafe':
        emoji = '☕';
        color = '#F59E0B';
        break;
      case 'convenience_store':
        emoji = '🏪';
        color = '#8B7355';
        break;
    }

    return L.divIcon({
      className: 'custom-shop-icon',
      html: `<div style="background-color: ${color}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white;">${emoji}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  };

  const loadSafeShops = useCallback(async () => {
    if (!map || !isVisible) return;

    console.log('🛍️ Loading Safe Shops data for current view...');
    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // If we have a route, search along the route
    const searchPoints: LatLng[] = routePath
      ? routePath
        .filter((_, i) => i % Math.max(1, Math.floor(routePath.length / 5)) === 0)
      : [center];

    console.log(`📍 Searching around ${searchPoints.length} points.`);
    console.warn('Note: searchNearby with ORS Geocoding is not fully implemented yet, so shops may not appear.');

    for (const point of searchPoints) {
      for (const type of SHOP_TYPES) {
        try {
          // searchNearby currently returns an empty array with ORS Geocoding.
          // This will need to be replaced with a proper nearby search implementation (e.g., Overpass API)
          const places = await searchNearby(point, type, 1500);
          console.log(`🔍 Found ${places.length} results for shop type: ${type}`);

          places.slice(0, 5).forEach((place: any) => {
            if (markersRef.current.has(place.placeId)) return;

            const marker = L.marker([place.position.lat, place.position.lng], {
              icon: getShopIcon(type),
              title: place.name,
            }).addTo(map);

            // Glowing effect for safe shops (Leaflet equivalent)
            const circle = L.circle([place.position.lat, place.position.lng], {
              color: '#22C55E',
              fillColor: '#22C55E',
              fillOpacity: 0.15,
              radius: 50,
            }).addTo(map);

            // Animate glow
            let opacity = 0.15;
            let increasing = true;
            const interval = setInterval(() => {
              if (increasing) {
                opacity += 0.02;
                if (opacity >= 0.3) increasing = false;
              } else {
                opacity -= 0.02;
                if (opacity <= 0.1) increasing = true;
              }
              circle.setStyle({ fillOpacity: opacity });
            }, 100);

            // Info window (popup in Leaflet)
            const infoContent = `
              <div style="padding: 12px; font-family: 'Inter', sans-serif; max-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 18px;">${getTypeEmoji(type)}</span>
                  <span style="font-weight: 600; font-size: 14px; color: #3d3429;">${place.name}</span>
                </div>
                ${place.rating ? `
                  <div style="font-size: 12px; color: #8B7355; margin-bottom: 4px;">
                    ⭐ ${place.rating.toFixed(1)}
                  </div>
                ` : ''}
                <div style="font-size: 12px; color: #666;">
                  ${place.address}
                </div>
                ${place.isOpen !== undefined ? `
                  <div style="font-size: 12px; margin-top: 4px; color: ${place.isOpen ? '#22C55E' : '#EF4444'};">
                    ${place.isOpen ? '✓ Open now' : '✗ Closed'}
                  </div>
                ` : ''}
                <button 
                  onclick="window.navigateToShop && window.navigateToShop('${place.placeId}')"
                  style="margin-top: 8px; padding: 6px 12px; background: #8B7355; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%;"
                >
                  Get Directions
                </button>
              </div>
            `;

            marker.bindPopup(infoContent);

            marker.on('click', () => {
              marker.openPopup();
            });

            // Store reference
            markersRef.current.set(place.placeId, marker);

            // Cleanup interval when marker is removed
            marker.on('remove', () => {
              clearInterval(interval);
              circle.remove();
            });
          });
        } catch (error) {
          console.error(`Error loading ${type}:`, error);
        }
      }
    }
  }, [map, isVisible, center, routePath, searchNearby]);

  useEffect(() => {
    if (isVisible) {
      loadSafeShops();
    } else {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [isVisible, loadSafeShops]);

  return null;
};

function getTypeEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    police: '👮',
    hospital: '🏥',
    pharmacy: '💊',
    cafe: '☕',
    convenience_store: '🏪',
  };
  return emojiMap[type] || '📍';
}
