// src/components/MapComponent.jsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource, WMTS } from 'ol/source';

import { useMapInitialization, useMapControls, useCoordinateDisplay, useFeatureSelection } from '../hooks/useMapInitialization.js';
import { LayerManager } from '../services/layer-manager.service.js';
import { WMTSService } from '../services/wmts.service.js';
import { DrawingService } from '../services/drawing.service.js';
import { MapControls } from './MapControls.jsx';
import { CoordinateDisplay } from './CoordinateDisplay.jsx';
import { BaseLayerSelector } from './BaseLayerSelector.jsx';
import { MAP_CONSTANTS, DRAWING_MODES, BASE_LAYER_CONFIGS } from '../constants/map.constants.js';

const MAP_ELEMENT_ID = 'openlayers-map';

export const MapComponent = ({
                                 mainLayer,
                                 layerCenter,
                                 selectedRowIndex,
                                 setSelectedEntity,
                                 layerName = 'layer',
                                 otherLayersGeometry = null,
                                 onPolygonDraw = null,
                                 entityIdColumn = MAP_CONSTANTS.DEFAULT_ENTITY_ID_COLUMN,
                                 entityColor = null,
                             }) => {
    // Services
    const layerManager = useMemo(() => new LayerManager(), []);
    const drawingService = useMemo(() => new DrawingService(), []);

    // State
    const [selectedBaseLayer, setSelectedBaseLayer] = useState('satellite');
    const [currentDrawingMode, setCurrentDrawingMode] = useState(DRAWING_MODES.NONE);
    const [baseLayers, setBaseLayers] = useState({});
    const [mainVectorLayer, setMainVectorLayer] = useState(null);
    const [otherVectorLayer, setOtherVectorLayer] = useState(null);
    const [isLoadingLayers, setIsLoadingLayers] = useState(true);
    const [layerError, setLayerError] = useState(null);

    // Hooks
    const { map, isMapReady } = useMapInitialization(
        MAP_ELEMENT_ID,
        layerCenter || MAP_CONSTANTS.DEFAULT_CENTER,
        MAP_CONSTANTS.DEFAULT_ZOOM
    );
    const { zoomIn, zoomOut, fitToLayer } = useMapControls(map);
    const coordinates = useCoordinateDisplay(map);

    useFeatureSelection(map, useCallback((featureProperties) => {
        setSelectedEntity(featureProperties);
    }, [setSelectedEntity]));

    // Initialize base layers
    useEffect(() => {
        if (!isMapReady || !map) return;

        const initializeBaseLayers = async () => {
            setIsLoadingLayers(true);
            setLayerError(null);

            try {
                // TODO: Replace with actual WMTS URLs from your server
                const layerConfigs = {
                    osm: {
                        ...BASE_LAYER_CONFIGS.OSM,
                        url: 'https://your-server.com/wmts/osm/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
                    },
                    satellite: {
                        ...BASE_LAYER_CONFIGS.SATELLITE,
                        url: 'https://your-server.com/wmts/satellite/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
                    },
                    roads: {
                        ...BASE_LAYER_CONFIGS.ROADS,
                        url: 'https://your-server.com/wmts/roads/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
                    },
                };

                const layers = {};

                Object.entries(layerConfigs).forEach(([key, config]) => {
                    try {
                        const layer = WMTSService.createWMTSLayer(config);
                        layers[key] = layer;
                        map.addLayer(layer);
                    } catch (error) {
                        console.warn(`Failed to create layer ${key}:`, error);
                    }
                });

                setBaseLayers(layers);

                // Set default visible layer
                if (layers[selectedBaseLayer]) {
                    layers[selectedBaseLayer].setVisible(true);
                }
            } catch (error) {
                console.error('Failed to initialize base layers:', error);
                setLayerError('Failed to load base layers');
            } finally {
                setIsLoadingLayers(false);
            }
        };

        initializeBaseLayers();
    }, [isMapReady, map, selectedBaseLayer]);

    // Handle main layer
    useEffect(() => {
        if (!isMapReady || !map || !mainLayer) return;

        try {
            const styleFunction = entityColor ? (feature, defaultColor) => {
                try {
                    return entityColor(feature.getProperties(), defaultColor);
                } catch (error) {
                    console.warn('Error in entity color function:', error);
                    return {
                        fillColor: defaultColor,
                        fillOpacity: 0.2,
                        strokeColor: defaultColor,
                        strokeWidth: 2,
                        strokeOpacity: 1,
                    };
                }
            } : undefined;

            const vectorLayer = layerManager.createVectorLayer(mainLayer, layerName, styleFunction);
            setMainVectorLayer(vectorLayer);
            map.addLayer(vectorLayer);

            // Auto-fit to layer if no specific center provided
            if (!layerCenter) {
                setTimeout(() => {
                    layerManager.fitToLayerExtent(map, vectorLayer);
                }, 100);
            }

            return () => {
                if (map.getLayers().getArray().includes(vectorLayer)) {
                    map.removeLayer(vectorLayer);
                }
            };
        } catch (error) {
            console.error('Failed to create main layer:', error);
            setLayerError('Failed to load main data layer');
        }
    }, [isMapReady, map, mainLayer, layerName, entityColor, layerManager, layerCenter]);

    // Handle other layers
    useEffect(() => {
        if (!isMapReady || !map || !otherLayersGeometry) return;

        try {
            const vectorLayer = layerManager.createVectorLayer(otherLayersGeometry, 'other-layers');
            setOtherVectorLayer(vectorLayer);
            map.addLayer(vectorLayer);

            return () => {
                if (map.getLayers().getArray().includes(vectorLayer)) {
                    map.removeLayer(vectorLayer);
                }
            };
        } catch (error) {
            console.error('Failed to create other layers:', error);
        }
    }, [isMapReady, map, otherLayersGeometry, layerManager]);

    // Handle selected feature
    useEffect(() => {
        if (!mainVectorLayer || !selectedRowIndex) return;

        try {
            layerManager.highlightFeature(mainVectorLayer, selectedRowIndex, entityIdColumn);

            // Fly to selected feature
            const source = mainVectorLayer.getSource();
            if (source && map) {
                let featureFound = false;

                source.forEachFeature((feature) => {
                    const properties = feature.getProperties();
                    if (properties[entityIdColumn] === selectedRowIndex) {
                        featureFound = true;
                        const geometry = feature.getGeometry();

                        if (geometry) {
                            const extent = geometry.getExtent();
                            const geometryType = geometry.getType();

                            // Handle different geometry types
                            switch (geometryType) {
                                case 'Point':
                                    { const center = extent.slice(0, 2);
                                    map.getView().animate({
                                        center,
                                        zoom: 17,
                                        duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                    });
                                    break; }

                                case 'LineString':
                                case 'MultiLineString':
                                    map.getView().fit(extent, {
                                        duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                        padding: [50, 50, 50, 50],
                                        maxZoom: 14,
                                    });
                                    break;

                                case 'Polygon':
                                case 'MultiPolygon':
                                    map.getView().fit(extent, {
                                        duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                        padding: [50, 50, 50, 50],
                                        maxZoom: 16,
                                    });
                                    break;

                                default:
                                    map.getView().fit(extent, {
                                        duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                        padding: [50, 50, 50, 50],
                                    });
                            }
                        }
                        return false; // Stop iteration
                    }
                });

                if (!featureFound) {
                    console.warn(`Feature with ${entityIdColumn}=${selectedRowIndex} not found`);
                }
            }
        } catch (error) {
            console.error('Failed to handle selected feature:', error);
        }
    }, [selectedRowIndex, mainVectorLayer, entityIdColumn, layerManager, map]);

    // Handle base layer switching
    const handleBaseLayerChange = useCallback((layerId) => {
        try {
            Object.values(baseLayers).forEach(layer => layer.setVisible(false));

            if (baseLayers[layerId]) {
                baseLayers[layerId].setVisible(true);
                setSelectedBaseLayer(layerId);
            }
        } catch (error) {
            console.error('Failed to switch base layer:', error);
        }
    }, [baseLayers]);

    // Handle drawing mode changes
    const handleDrawingModeChange = useCallback((mode) => {
        if (!map) return;

        try {
            setCurrentDrawingMode(mode);

            if (mode === DRAWING_MODES.NONE) {
                drawingService.stopDrawing(map);
            } else {
                drawingService.startDrawing(map, mode, (wkt) => {
                    if (onPolygonDraw) {
                        onPolygonDraw(wkt);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to change drawing mode:', error);
        }
    }, [map, drawingService, onPolygonDraw]);

    // Handle clear drawing
    const handleClearDrawing = useCallback(() => {
        if (!map) return;

        try {
            drawingService.stopDrawing(map);
            drawingService.clearDrawing();
            setCurrentDrawingMode(DRAWING_MODES.NONE);

            if (onPolygonDraw) {
                onPolygonDraw(null);
            }
        } catch (error) {
            console.error('Failed to clear drawing:', error);
        }
    }, [map, drawingService, onPolygonDraw]);

    // Handle fit to layer
    const handleFitToLayer = useCallback(() => {
        if (mainVectorLayer && map) {
            try {
                layerManager.fitToLayerExtent(map, mainVectorLayer);
            } catch (error) {
                console.error('Failed to fit to layer:', error);
            }
        }
    }, [mainVectorLayer, map, layerManager]);

    // Add drawing layer to map
    useEffect(() => {
        if (!isMapReady || !map) return;

        try {
            const drawingLayer = drawingService.getDrawingLayer();
            map.addLayer(drawingLayer);

            return () => {
                if (map.getLayers().getArray().includes(drawingLayer)) {
                    map.removeLayer(drawingLayer);
                }
            };
        } catch (error) {
            console.error('Failed to add drawing layer:', error);
        }
    }, [isMapReady, map, drawingService]);

    // Prepare base layer selector data
    const baseLayerSelectorData = useMemo(() => [
        {
            id: 'osm',
            name: BASE_LAYER_CONFIGS.OSM.name,
            active: selectedBaseLayer === 'osm',
        },
        {
            id: 'satellite',
            name: BASE_LAYER_CONFIGS.SATELLITE.name,
            active: selectedBaseLayer === 'satellite',
        },
        {
            id: 'roads',
            name: BASE_LAYER_CONFIGS.ROADS.name,
            active: selectedBaseLayer === 'roads',
        },
    ], [selectedBaseLayer]);

    return (
        <div className="relative w-full h-full">
            <div
                id={MAP_ELEMENT_ID}
                className="w-full h-full bg-gray-100"
                style={{ minHeight: '400px' }}
            />

            {/* Loading indicator */}
            {isLoadingLayers && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            <span className="text-gray-700 font-medium">טוען שכבות מפה...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error indicator */}
            {layerError && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
                        <strong className="font-bold">שגיאה: </strong>
                        <span className="block sm:inline">{layerError}</span>
                    </div>
                </div>
            )}

            {isMapReady && !isLoadingLayers && (
                <>
                    <MapControls
                        zoomIn={zoomIn}
                        zoomOut={zoomOut}
                        fitToLayer={handleFitToLayer}
                        onDrawingModeChange={handleDrawingModeChange}
                        currentDrawingMode={currentDrawingMode}
                        onClearDrawing={handleClearDrawing}
                    />

                    <CoordinateDisplay
                        latitude={coordinates.latitude}
                        longitude={coordinates.longitude}
                        zoom={coordinates.zoom}
                        onZoomToLayer={handleFitToLayer}
                    />

                    {baseLayerSelectorData.length > 0 && (
                        <BaseLayerSelector
                            layers={baseLayerSelectorData}
                            onLayerChange={handleBaseLayerChange}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default MapComponent;