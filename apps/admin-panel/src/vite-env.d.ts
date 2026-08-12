/// <reference types="vite/client" />

declare module '@mapbox/mapbox-gl-geocoder' {
  import { Map } from 'mapbox-gl';
  import { Evented } from 'mapbox-gl';

  interface GeocoderOptions {
    accessToken: string;
    mapboxgl: any;
    marker?: boolean;
    placeholder?: string;
    countries?: string;
    [key: string]: any;
  }

  class MapboxGeocoder extends Evented {
    constructor(options: GeocoderOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    on(type: string, listener: (e: any) => void): this;
  }

  export default MapboxGeocoder;
}
