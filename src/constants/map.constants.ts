// src/constants/map.constants.ts

export const MAP_CONSTANTS = {
    DEFAULT_ZOOM: 10,
    DEFAULT_CENTER: [35.2137, 31.7683] as [number, number], // Tel Aviv
    ANIMATION_DURATION: 1000,
    DEFAULT_ENTITY_ID_COLUMN: 'מזהה רשימה',
    TILE_MATRIX_SET: 'WorldCRS84',
    TILE_SIZE: 256,
    MAX_ZOOM: 21,
    MIN_ZOOM: 1,
} as const;

export const DRAWING_MODES = {
    NONE: 'none',
    POLYGON: 'polygon',
    LINE: 'line',
    POINT: 'point',
} as const;

export const DEFAULT_STYLES = {
    FILL_COLOR: '#3388ff',
    STROKE_COLOR: '#3388ff',
    STROKE_WIDTH: 2,
    FILL_OPACITY: 0.2,
    STROKE_OPACITY: 1,
    SELECTED_FILL_COLOR: '#ff3388',
    SELECTED_STROKE_COLOR: '#ff3388',
    HIGHLIGHT_FILL_OPACITY: 0.4,
} as const;

export const BASE_LAYER_CONFIGS = {
    OSM: {
        id: 'osm',
        name: 'מפת רחוב',
        url: '', // Will be populated from WMTS service
    },
    SATELLITE: {
        id: 'satellite',
        name: 'תמונת לווין',
        url: '', // Will be populated from WMTS service
    },
    ROADS: {
        id: 'roads',
        name: 'דרכים וכבישים',
        url: '', // Will be populated from WMTS service
    },
} as const;