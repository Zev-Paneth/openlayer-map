// src/components/MapComponent.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource, WMTS } from 'ol/source';
import { Extent } from 'ol/extent';
import { transform } from 'ol/proj';

import type { MapProps } from '../types/map.types';
import { useMapInitialization, useMapControls, useCoordinateDisplay, useFeatureSelection } from '../hooks/useMapInitialization';
import { LayerManager } from '../services/layer-manager.service';
import { WMTSService } from '../services/wmts.service';
import { DrawingService } from '../services/drawing.service';
import { MapControls } from './MapControls';
import { CoordinateDisplay } from './CoordinateDisplay';
import { BaseLayerSelector } from './BaseLayerSelector';
import { MAP_CONSTANTS, DRAWING_MODES, BASE_LAYER_CONFIGS } from '../constants/map.constants';

const MAP_ELEMENT_ID = 'openlayers-map';

export const MapComponent: React.FC<MapProps> = ({
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
    const [selectedBaseLayer, setSelectedBaseLayer] = useState<string>('satellite');
    const [currentDrawingMode, setCurrentDrawingMode] = useState<keyof typeof DRAWING_MODES>(DRAWING_MODES.NONE);
    const [baseLayers, setBaseLayers] = useState<Record<string, TileLayer<WMTS>>>({});
    const [mainVectorLayer, setMainVectorLayer] = useState<VectorLayer<VectorSource> | null>(null);
    const [otherVectorLayer, setOtherVectorLayer] = useState<VectorLayer<VectorSource> | null>(null);

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

                const layers: Record<string, TileLayer<WMTS>> = {};

                Object.entries(layerConfigs).forEach(([key, config]) => {
                    const layer = WMTSService.createWMTSLayer(config);
                    layers[key] = layer;
                    map.addLayer(layer);
                });

                setBaseLayers(layers);

                // Set default visible layer
                if (layers[selectedBaseLayer]) {
                    layers[selectedBaseLayer].setVisible(true);
                }
            } catch (error) {
                console.error('Failed to initialize base layers:', error);
            }
        };

        initializeBaseLayers();
    }, [isMapReady, map, selectedBaseLayer]);

    // Handle main layer
    useEffect(() => {
        if (!isMapReady || !map || !mainLayer) return;

        try {
            const styleFunction = entityColor ? (feature: any, defaultColor: string) => {
                return entityColor(feature.getProperties(), defaultColor);
            } : undefined;

            const vectorLayer = layerManager.createVectorLayer(mainLayer, layerName, styleFunction);
            setMainVectorLayer(vectorLayer);
            map.addLayer(vectorLayer);

            return () => {
                if (map.getLayers().getArray().includes(vectorLayer)) {
                    map.removeLayer(vectorLayer);
                }
            };
        } catch (error) {
            console.error('Failed to create main layer:', error);
        }
    }, [isMapReady, map, mainLayer, layerName, entityColor, layerManager]);

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
                source.forEachFeature((feature) => {
                    const properties = feature.getProperties();
                    if (properties[entityIdColumn] === selectedRowIndex) {
                        const geometry = feature.getGeometry();
                        if (geometry) {
                            const extent = geometry.getExtent();
                            const geometryType = geometry.getType();

                            if (geometryType === 'Point') {
                                const center = extent.slice(0, 2) as [number, number];
                                map.getView().animate({
                                    center,
                                    zoom: 17,
                                    duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                });
                            } else {
                                map.getView().fit(extent, {
                                    duration: MAP_CONSTANTS.ANIMATION_DURATION,
                                    padding: [50, 50, 50, 50],
                                    maxZoom: 16,
                                });
                            }
                        }
                        return false; // Stop iteration
                    }
                });
            }
        } catch (error) {
            console.error('Failed to handle selected feature:', error);
        }
    }, [selectedRowIndex, mainVectorLayer, entityIdColumn, layerManager, map]);

    // Handle base layer switching
    const handleBaseLayerChange = useCallback((layerId: string) => {
        Object.values(baseLayers).forEach(layer => layer.setVisible(false));

        if (baseLayers[layerId]) {
            baseLayers[layerId].setVisible(true);
            setSelectedBaseLayer(layerId);
        }
    }, [baseLayers]);

    // Handle drawing mode changes
    const handleDrawingModeChange = useCallback((mode: keyof typeof DRAWING_MODES) => {
        if (!map) return;

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
    }, [map, drawingService, onPolygonDraw]);

    // Handle clear drawing
    const handleClearDrawing = useCallback(() => {
        if (!map) return;

        drawingService.stopDrawing(map);
        drawingService.clearDrawing();
        setCurrentDrawingMode(DRAWING_MODES.NONE);

        if (onPolygonDraw) {
            onPolygonDraw(null);
        }
    }, [map, drawingService, onPolygonDraw]);

    // Handle fit to layer
    const handleFitToLayer = useCallback(() => {
        if (mainVectorLayer && map) {
            layerManager.fitToLayerExtent(map, mainVectorLayer);
        }
    }, [mainVectorLayer, map, layerManager]);

    // Add drawing layer to map
    useEffect(() => {
        if (!isMapReady || !map) return;

        const drawingLayer = drawingService.getDrawingLayer();
        map.addLayer(drawingLayer);

        return () => {
            if (map.getLayers().getArray().includes(drawingLayer)) {
                map.removeLayer(drawingLayer);
            }
        };
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

            {isMapReady && (
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

                    <BaseLayerSelector
                        layers={baseLayerSelectorData}
                        onLayerChange={handleBaseLayerChange}
                    />
                </>
            )}
        </div>
    );
};

export default MapComponent;