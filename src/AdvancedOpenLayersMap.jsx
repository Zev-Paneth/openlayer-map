import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { WMTS, Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { Draw, Modify, Select } from 'ol/interaction';
import { WMTSTileGrid } from 'ol/tilegrid';
import { get as getProjection } from 'ol/proj';
import { getTopLeft, getWidth, getHeight } from 'ol/extent';
import { ZoomIn, ZoomOut, MapPin, Square, Edit3 } from 'lucide-react';

// Constants for WMTS configuration
const WMTS_CONFIG = {
    PROJECTION: 'EPSG:4326',
    TILE_SIZE: 256,
    MATRIX_SET: 'WorldCRS84',
    RESOLUTIONS: [
        0.703125, 0.3515625, 0.17578125, 0.087890625,
        0.043945312, 0.021972656, 0.010986328, 0.005493164,
        0.002746582, 0.001373291, 0.000686645, 0.000343322,
        8.58306E-05, 4.29153E-05, 2.14576E-05, 1.07288E-05,
        5.36441E-06, 2.68220E-06, 1.34110E-06, 6.70552E-07,
        3.35276E-07
    ]
};

// Base layer configurations
const BASE_LAYERS = {
    satellite: {
        name: 'לווין',
        type: 'satellite'
    },
    roads: {
        name: 'דרכים וכבישים',
        type: 'roads'
    },
    osm: {
        name: 'OSM',
        type: 'osm'
    }
};

// Utility functions
const GeometryUtils = {
    /**
     * Extract coordinates from different geometry types
     */
    getCoordinatesFromGeometry(geometry) {
        const { type, coordinates } = geometry;

        switch (type) {
            case 'Point':
                return coordinates;
            case 'LineString':
                return coordinates[0];
            case 'MultiLineString':
                return coordinates[0][0];
            case 'MultiPolygon':
                return coordinates[0][0][0];
            case 'Polygon':
                return coordinates[0][0];
            default:
                return coordinates;
        }
    },

    /**
     * Create bounding box from geometry
     */
    createBounds(geometry) {
        const coords = this.getCoordinatesFromGeometry(geometry);
        if (Array.isArray(coords) && coords.length >= 2) {
            return [coords[0], coords[1], coords[0], coords[1]];
        }
        return null;
    },

    /**
     * Convert WKT polygon to proper format
     */
    formatPolygonToWKT(coordinates) {
        const coordString = coordinates
            .map(coord => `${coord[0]} ${coord[1]}`)
            .join(', ');
        return `POLYGON ((${coordString}, ${coordinates[0][0]} ${coordinates[0][1]}))`;
    }
};

// WMTS Service for creating tile layers
class WMTSService {
    constructor(token) {
        this.token = token;
    }

    createWMTSSource(layerConfig) {
        const projection = getProjection(WMTS_CONFIG.PROJECTION);
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / WMTS_CONFIG.TILE_SIZE;
        const resolutions = WMTS_CONFIG.RESOLUTIONS;
        const matrixIds = resolutions.map((_, i) => i.toString());

        const tileGrid = new WMTSTileGrid({
            origin: getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds,
        });

        return new WMTS({
            url: `${layerConfig.baseUrl}/{TileMatrix}/{TileCol}/{TileRow}.jpeg?token=${this.token}`,
            layer: layerConfig.layerName,
            matrixSet: WMTS_CONFIG.MATRIX_SET,
            format: 'image/jpeg',
            projection: projection,
            tileGrid: tileGrid,
            style: 'default',
            wrapX: true,
        });
    }

    createTileLayer(layerConfig) {
        return new TileLayer({
            source: this.createWMTSSource(layerConfig),
            visible: layerConfig.visible || false,
        });
    }
}

// Style factory for different feature types
class StyleFactory {
    static createFeatureStyle(feature, layerName, colorConfig, isSelected = false) {
        const entityId = feature.get('מזהה רשימה');
        const geometry = feature.getGeometry();
        const geometryType = geometry.getType();

        const baseColor = colorConfig?.fillColor || '#3388ff';
        const opacity = colorConfig?.fillOpacity || 0.6;
        const strokeColor = isSelected ? '#ff0000' : '#ffffff';
        const strokeWidth = isSelected ? 3 : 1;

        switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
                return new Style({
                    image: new CircleStyle({
                        radius: isSelected ? 8 : 6,
                        fill: new Fill({
                            color: baseColor,
                        }),
                        stroke: new Stroke({
                            color: strokeColor,
                            width: strokeWidth,
                        }),
                    }),
                });

            case 'LineString':
            case 'MultiLineString':
                return new Style({
                    stroke: new Stroke({
                        color: baseColor,
                        width: isSelected ? 4 : 2,
                    }),
                });

            case 'Polygon':
            case 'MultiPolygon':
                return new Style({
                    fill: new Fill({
                        color: `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    }),
                    stroke: new Stroke({
                        color: strokeColor,
                        width: strokeWidth,
                    }),
                });

            default:
                return new Style({
                    fill: new Fill({ color: baseColor }),
                    stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
                });
        }
    }
}

// Main vector layer service
class VectorLayerService {
    constructor() {
        this.layers = new Map();
    }

    createVectorLayer(mainLayer, layerName, entityColor, onFeatureClick, selectedEntityId) {
        const vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(mainLayer, {
                featureProjection: WMTS_CONFIG.PROJECTION,
            }),
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => {
                const entityId = feature.get('מזהה רשימה');
                const isSelected = entityId === selectedEntityId;
                return StyleFactory.createFeatureStyle(feature, layerName, entityColor, isSelected);
            },
        });

        // Add click interaction
        vectorLayer.on('click', (event) => {
            const feature = event.target.getFeatures()[0];
            if (feature && onFeatureClick) {
                onFeatureClick(feature.getProperties());
            }
        });

        this.layers.set(layerName, vectorLayer);
        return vectorLayer;
    }

    updateLayerStyle(layerName, entityColor, selectedEntityId) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.getSource().getFeatures().forEach(feature => {
                const entityId = feature.get('מזהה רשימה');
                const isSelected = entityId === selectedEntityId;
                feature.setStyle(StyleFactory.createFeatureStyle(feature, layerName, entityColor, isSelected));
            });
        }
    }
}

// Draw interaction service for polygon drawing
class DrawService {
    constructor(map, onPolygonDraw) {
        this.map = map;
        this.onPolygonDraw = onPolygonDraw;
        this.drawInteraction = null;
        this.modifyInteraction = null;
        this.drawSource = new VectorSource();
        this.drawLayer = new VectorLayer({
            source: this.drawSource,
            style: new Style({
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 0.2)',
                }),
                stroke: new Stroke({
                    color: '#ffcc33',
                    width: 2,
                }),
            }),
        });

        this.map.addLayer(this.drawLayer);
    }

    startDrawing(geometryType = 'Polygon') {
        this.stopDrawing();

        this.drawInteraction = new Draw({
            source: this.drawSource,
            type: geometryType,
        });

        this.drawInteraction.on('drawend', (event) => {
            const feature = event.feature;
            const geometry = feature.getGeometry();
            const coordinates = geometry.getCoordinates()[0];
            const wkt = GeometryUtils.formatPolygonToWKT(coordinates);

            if (this.onPolygonDraw) {
                this.onPolygonDraw(wkt);
            }
        });

        this.map.addInteraction(this.drawInteraction);
    }

    stopDrawing() {
        if (this.drawInteraction) {
            this.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;
        }
    }

    clearDrawings() {
        this.drawSource.clear();
        if (this.onPolygonDraw) {
            this.onPolygonDraw(null);
        }
    }
}

// Position display component
const PositionDisplay = ({ map }) => {
    const [coordinates, setCoordinates] = useState({ lon: 0, lat: 0 });
    const [zoom, setZoom] = useState(0);

    useEffect(() => {
        if (!map) return;

        const updatePosition = () => {
            const view = map.getView();
            const center = view.getCenter();
            const currentZoom = view.getZoom();

            setCoordinates({
                lon: center[0].toFixed(6),
                lat: center[1].toFixed(6)
            });
            setZoom(currentZoom.toFixed(2));
        };

        map.on('moveend', updatePosition);
        updatePosition();

        return () => {
            map.un('moveend', updatePosition);
        };
    }, [map]);

    return (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-2 rounded shadow text-sm">
            <div>Lon: {coordinates.lon}°</div>
            <div>Lat: {coordinates.lat}°</div>
            <div>Zoom: {zoom}</div>
        </div>
    );
};

// Map controls component
const MapControls = ({ map, onStartDrawing, onClearDrawings }) => {
    const zoomIn = useCallback(() => {
        if (map) {
            const view = map.getView();
            view.animate({ zoom: view.getZoom() + 1, duration: 250 });
        }
    }, [map]);

    const zoomOut = useCallback(() => {
        if (map) {
            const view = map.getView();
            view.animate({ zoom: view.getZoom() - 1, duration: 250 });
        }
    }, [map]);

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
                onClick={zoomIn}
                className="bg-white hover:bg-gray-100 p-2 rounded shadow border"
                title="זום פנימה"
            >
                <ZoomIn size={20} />
            </button>
            <button
                onClick={zoomOut}
                className="bg-white hover:bg-gray-100 p-2 rounded shadow border"
                title="זום החוצה"
            >
                <ZoomOut size={20} />
            </button>
            <button
                onClick={() => onStartDrawing('Polygon')}
                className="bg-white hover:bg-gray-100 p-2 rounded shadow border"
                title="צייר פוליגון"
            >
                <Square size={20} />
            </button>
            <button
                onClick={onClearDrawings}
                className="bg-white hover:bg-gray-100 p-2 rounded shadow border"
                title="נקה ציורים"
            >
                <Edit3 size={20} />
            </button>
        </div>
    );
};

// Base layer selector component
const BaseLayerSelector = ({ selectedLayer, onLayerChange }) => {
    return (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-2 rounded shadow">
            <div className="text-sm font-medium mb-2">שכבות רקע:</div>
            {Object.entries(BASE_LAYERS).map(([key, layer]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                        type="radio"
                        name="baseLayer"
                        value={key}
                        checked={selectedLayer === key}
                        onChange={(e) => onLayerChange(e.target.value)}
                    />
                    {layer.name}
                </label>
            ))}
        </div>
    );
};

// Main Map Component
const AdvancedOpenLayersMap = ({
                                   mainLayer,
                                   layerCenter = [35.2, 31.8],
                                   selectedRowIndex,
                                   setSelectedEntity,
                                   layerName = 'layer',
                                   otherLayersGeometry = null,
                                   onPolygonDraw = null,
                                   entityIdColumn = 'מזהה רשימה',
                                   entityColor = null,
                                   token = 'your-token-here' // This should come from props
                               }) => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [selectedBaseLayer, setSelectedBaseLayer] = useState('satellite');
    const [wmtsService] = useState(() => new WMTSService(token));
    const [vectorService] = useState(() => new VectorLayerService());
    const [drawService, setDrawService] = useState(null);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current) return;

        const initialMap = new Map({
            target: mapRef.current,
            view: new View({
                projection: WMTS_CONFIG.PROJECTION,
                center: layerCenter,
                zoom: 8,
            }),
        });

        setMap(initialMap);

        return () => {
            initialMap.setTarget(null);
        };
    }, [layerCenter]);

    // Initialize draw service
    useEffect(() => {
        if (map && onPolygonDraw) {
            const service = new DrawService(map, onPolygonDraw);
            setDrawService(service);

            return () => {
                service.stopDrawing();
            };
        }
    }, [map, onPolygonDraw]);

    // Handle base layer changes
    useEffect(() => {
        if (!map) return;

        // Remove existing base layers
        const layers = map.getLayers().getArray().slice();
        layers.forEach(layer => {
            if (layer instanceof TileLayer && layer !== layers[layers.length - 1]) {
                map.removeLayer(layer);
            }
        });

        // Add selected base layer
        const layerConfig = {
            baseUrl: `https://your-wmts-server.com/wmts/{TileMatrixSet}`,
            layerName: selectedBaseLayer,
            visible: true
        };

        const baseLayer = wmtsService.createTileLayer(layerConfig);
        map.addLayer(baseLayer);
    }, [map, selectedBaseLayer, wmtsService]);

    // Handle main layer and vector features
    useEffect(() => {
        if (!map || !mainLayer) return;

        // Remove existing vector layers
        const layers = map.getLayers().getArray().slice();
        layers.forEach(layer => {
            if (layer instanceof VectorLayer && !layer.get('isDrawLayer')) {
                map.removeLayer(layer);
            }
        });

        // Add main layer
        const vectorLayer = vectorService.createVectorLayer(
            mainLayer,
            layerName,
            entityColor,
            setSelectedEntity,
            selectedRowIndex
        );

        map.addLayer(vectorLayer);
    }, [map, mainLayer, layerName, entityColor, selectedRowIndex, setSelectedEntity, vectorService]);

    // Handle selected entity flyTo
    useEffect(() => {
        if (!map || !mainLayer || !selectedRowIndex) return;

        const feature = mainLayer.features?.find(
            feature => feature.properties[entityIdColumn] === selectedRowIndex
        );

        if (!feature) return;

        const geometry = feature.geometry;
        const coordinates = GeometryUtils.getCoordinatesFromGeometry(geometry);
        const view = map.getView();

        if (geometry.type === 'Point') {
            view.animate({
                center: coordinates,
                zoom: 17,
                duration: 1000
            });
        } else if (geometry.type === 'LineString') {
            const bounds = GeometryUtils.createBounds(geometry);
            if (bounds) {
                view.fit(bounds, { duration: 1000, padding: [50, 50, 50, 50] });
            }
        } else {
            const coords = GeometryUtils.getCoordinatesFromGeometry(geometry);
            if (coords.length >= 2) {
                view.animate({
                    center: coords,
                    zoom: 15,
                    duration: 1000
                });
            }
        }
    }, [map, mainLayer, selectedRowIndex, entityIdColumn]);

    const handleStartDrawing = useCallback((geometryType) => {
        if (drawService) {
            drawService.startDrawing(geometryType);
        }
    }, [drawService]);

    const handleClearDrawings = useCallback(() => {
        if (drawService) {
            drawService.clearDrawings();
        }
    }, [drawService]);

    return (
        <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
            <div ref={mapRef} className="w-full h-full" />

            <BaseLayerSelector
                selectedLayer={selectedBaseLayer}
                onLayerChange={setSelectedBaseLayer}
            />

            <MapControls
                map={map}
                onStartDrawing={handleStartDrawing}
                onClearDrawings={handleClearDrawings}
            />

            <PositionDisplay map={map} />
        </div>
    );
};

// Demo component
const MapDemo = () => {
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    // Sample GeoJSON data
    const sampleMainLayer = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {
                    "מזהה רשימה": "1",
                    "שם": "נקודה ראשונה"
                },
                geometry: {
                    type: "Point",
                    coordinates: [35.2, 31.8]
                }
            },
            {
                type: "Feature",
                properties: {
                    "מזהה רשימה": "2",
                    "שם": "פוליגון ראשון"
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [35.1, 31.7],
                        [35.3, 31.7],
                        [35.3, 31.9],
                        [35.1, 31.9],
                        [35.1, 31.7]
                    ]]
                }
            }
        ]
    };

    const handlePolygonDraw = useCallback((wkt) => {
        console.log('Polygon drawn:', wkt);
    }, []);

    const handleEntitySelect = useCallback((entityData) => {
        setSelectedEntity(entityData);
        setSelectedRowIndex(entityData["מזהה רשימה"]);
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Advanced OpenLayers Map</h1>

            <AdvancedOpenLayersMap
                mainLayer={sampleMainLayer}
                selectedRowIndex={selectedRowIndex}
                setSelectedEntity={handleEntitySelect}
                onPolygonDraw={handlePolygonDraw}
                entityColor={{ fillColor: '#ff6b6b', fillOpacity: 0.7 }}
                token="your-actual-token"
            />

            {selectedEntity && (
                <div className="mt-4 p-4 bg-blue-50 rounded">
                    <h3 className="font-semibold">Selected Entity:</h3>
                    <pre className="text-sm">{JSON.stringify(selectedEntity, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default MapDemo;