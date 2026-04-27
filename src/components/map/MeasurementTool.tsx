import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { X, Trash2 } from 'lucide-react';
import { LatLng } from '@/types/map';

interface MeasurementToolProps {
  map: L.Map | null;
  isActive: boolean;
  onClose: () => void;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  map,
  isActive,
  onClose,
}) => {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const clickListenerRef = useRef<L.LeafletEventHandlerFn | null>(null);

  // Calculate distance between two points
  const calculateDistance = useCallback((p1: LatLng, p2: LatLng): number => {
    const latLng1 = L.latLng(p1.lat, p1.lng);
    const latLng2 = L.latLng(p2.lat, p2.lng);
    return latLng1.distanceTo(latLng2);
  }, []);

  // Add point
  const addPoint = useCallback((position: LatLng) => {
    if (!map) return;

    const marker = L.marker([position.lat, position.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'measurement-marker-icon',
        html: '<div style="background-color: #8B7355; border-radius: 50%; width: 16px; height: 16px; border: 2px solid #FFFFFF;"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(map);

    markersRef.current.push(marker);

    setPoints((prev) => {
      const newPoints = [...prev, position];
      
      // Update polyline
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(
          newPoints.map((p) => [p.lat, p.lng])
        );
      }

      // Calculate total distance
      let total = 0;
      for (let i = 1; i < newPoints.length; i++) {
        total += calculateDistance(newPoints[i - 1], newPoints[i]);
      }
      setTotalDistance(total);

      return newPoints;
    });

    // Handle marker drag
    marker.on('drag', () => {
      updatePolyline();
    });
    marker.on('dragend', () => {
      updatePolyline();
    });
  }, [map, calculateDistance]);

  // Update polyline from markers
  const updatePolyline = useCallback(() => {
    const newPoints = markersRef.current.map((m) => {
      const pos = m.getLatLng();
      return { lat: pos.lat, lng: pos.lng };
    });

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(
        newPoints.map((p) => [p.lat, p.lng])
      );
    }

    setPoints(newPoints);

    // Calculate total distance
    let total = 0;
    for (let i = 1; i < newPoints.length; i++) {
      total += calculateDistance(newPoints[i - 1], newPoints[i]);
    }
    setTotalDistance(total);
  }, [calculateDistance]);

  // Initialize
  useEffect(() => {
    if (!map || !isActive) return;

    // Create polyline
    polylineRef.current = L.polyline([], {
      color: '#8B7355',
      weight: 3,
      opacity: 0.8,
    }).addTo(map);

    // Add click listener
    const clickHandler = (e: L.LeafletMouseEvent) => {
      addPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', clickHandler);
    clickListenerRef.current = clickHandler;

    // Change cursor (Leaflet handles this with CSS, or custom CSS)
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      // Cleanup
      if (clickListenerRef.current) {
        map.off('click', clickListenerRef.current);
      }
      polylineRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.getContainer().style.cursor = ''; // Reset cursor
    };
  }, [map, isActive, addPoint]);

  // Clear measurements
  const clearMeasurements = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylineRef.current?.setLatLngs([]);
    setPoints([]);
    setTotalDistance(0);
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  if (!isActive) return null;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-panel rounded-2xl p-4 z-20 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Distance: </span>
          <span className="font-semibold">{formatDistance(totalDistance)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearMeasurements}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Click on the map to add measurement points
      </p>
    </div>
  );
};
