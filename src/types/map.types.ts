// src/types/map.types.ts

export interface Feature {
    type: 'Feature';
    geometry: Geometry;
    properties: Record<string, any>;
}

export interface Geometry {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJsonLayer {
    type: 'FeatureCollection';
    features: Feature[];
}

export interface MapProps {
    mainLayer: GeoJsonLayer;
    layerCenter?: [number, number];
    selectedRowIndex?: string | number;
    setSelectedEntity: (entity: any) => void;
    layerName?: string;
    otherLayersGeometry?: GeoJsonLayer | null;
    onPolygonDraw?: (wkt: string | null) => void;
    entityIdColumn?: string;
    entityColor?: (entity: any, defaultColor: string) => StyleConfig;
}

export interface StyleConfig {
    fillColor: string;
    fillOpacity: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
}

export interface WMTSLayerConfig {
    id: string;
    name: string;
    url: string;
    visible?: boolean;
}

export interface BaseLayerConfig {
    OSM: WMTSLayerConfig;
    SATELLITE: WMTSLayerConfig;
    ROADS: WMTSLayerConfig;
}

export interface MapControls {
    zoomIn: () => void;
    zoomOut: () => void;
    fitToLayer: () => void;
    toggleDrawing: () => void;
}

export interface DrawingMode {
    NONE: 'none';
    POLYGON: 'polygon';
    LINE: 'line';
    POINT: 'point';
}

export interface CoordinateDisplay {
    latitude: number;
    longitude: number;
    zoom: number;
}