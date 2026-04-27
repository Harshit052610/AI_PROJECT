export interface LatLng {
  lat: number;
  lng: number;
}

export interface SafeShop {
  id: string;
  name: string;
  position: LatLng;
  type: 'police' | 'hospital' | 'pharmacy' | 'shop' | 'atm';
  rating?: number;
  isOpen?: boolean;
  address?: string;
}

export interface RadarDevice {
  id: string;
  /**
   * Optional: only present if the scanner provides a real GPS coordinate per device.
   * If missing, we MUST NOT place a phone marker on the map.
   */
  position?: LatLng;
  name: string;
  lastUpdate: number;
  status: 'active' | 'inactive' | 'sos';

  // Real radar payload fields
  mac?: string;
  vendor?: string;
  rssi?: number;
  distance?: number;
}

export interface RouteInfo {
  id: string;
  distance: string;
  duration: string;
  /**
   * Optional: only set when we can compute a real score.
   * (We intentionally avoid random/demo safety scores.)
   */
  safetyScore?: number;
  polyline: LatLng[];
  steps: RouteStep[];
  accidentCount?: number;
  shopCount?: number;
  publicDensity?: 'High' | 'Medium' | 'Low';
  isFastest?: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export type MapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type LayerType = 'traffic' | 'transit' | 'bicycling' | 'labels';

export interface MapState {
  center: LatLng;
  zoom: number;
  mapType: MapType;
  activeLayers: LayerType[];
  is3D: boolean;
  showLabels: boolean;
}

export interface NavigationState {
  isNavigating: boolean;
  mode: 'simulate' | 'real';
  currentPosition: LatLng | null;
  destination: LatLng | null;
  routes: RouteInfo[];
  selectedRoute: number;
  lastDirectionsStatus?: string;
}
