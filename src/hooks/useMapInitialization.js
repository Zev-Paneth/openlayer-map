// src/hooks/useMapInitialization.js

import { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import { MAP_CONSTANTS } from '../constants/map.constants.js';

export const useMapInitialization = (
    mapElementId,
    center = MAP_CONSTANTS.DEFAULT_CENTER,
    zoom = MAP_CONSTANTS.DEFAULT_ZOOM
) => {
    const mapRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (!mapRef.current) {
            const map = new Map({
                target: mapElementId,
                view: new View({
                    center,
                    zoom,
                    projection: 'EPSG:4326',
                    maxZoom: MAP_CONSTANTS.MAX_ZOOM,
                    minZoom: MAP_CONSTANTS.MIN_ZOOM,
                }),
                controls: defaultControls({
                    attribution: false,
                    zoom: false, // We'll create custom zoom controls
                }),
                interactions: defaultInteractions(),
            });

            mapRef.current = map;
            setIsMapReady(true);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.setTarget(undefined);
                mapRef.current = null;
                setIsMapReady(false);
            }
        };
    }, [mapElementId, center, zoom]);

    return { map: mapRef.current, isMapReady };
};

// useMapControls hook
export const useMapControls = (map) => {
    const zoomIn = () => {
        if (map) {
            const view = map.getView();
            const currentZoom = view.getZoom() || MAP_CONSTANTS.DEFAULT_ZOOM;
            view.animate({
                zoom: Math.min(currentZoom + 1, MAP_CONSTANTS.MAX_ZOOM),
                duration: 300,
            });
        }
    };

    const zoomOut = () => {
        if (map) {
            const view = map.getView();
            const currentZoom = view.getZoom() || MAP_CONSTANTS.DEFAULT_ZOOM;
            view.animate({
                zoom: Math.max(currentZoom - 1, MAP_CONSTANTS.MIN_ZOOM),
                duration: 300,
            });
        }
    };

    const fitToLayer = (layer) => {
        if (map && layer) {
            const source = layer.getSource();
            if (source) {
                const extent = source.getExtent();
                if (extent && extent.every(coord => isFinite(coord))) {
                    map.getView().fit(extent, {
                        duration: MAP_CONSTANTS.ANIMATION_DURATION,
                        padding: [50, 50, 50, 50],
                        maxZoom: 16,
                    });
                }
            }
        }
    };

    return { zoomIn, zoomOut, fitToLayer };
};

// useCoordinateDisplay hook
export const useCoordinateDisplay = (map) => {
    const [coordinates, setCoordinates] = useState({
        latitude: 0,
        longitude: 0,
        zoom: MAP_CONSTANTS.DEFAULT_ZOOM,
    });

    useEffect(() => {
        if (!map) return;

        const updateCoordinates = () => {
            const view = map.getView();
            const center = view.getCenter();
            const zoom = view.getZoom() || MAP_CONSTANTS.DEFAULT_ZOOM;

            if (center) {
                const [longitude, latitude] = center; // Already in EPSG:4326
                setCoordinates({
                    latitude: parseFloat(latitude.toFixed(6)),
                    longitude: parseFloat(longitude.toFixed(6)),
                    zoom: parseFloat(zoom.toFixed(2)),
                });
            }
        };

        // Update coordinates when view changes
        const view = map.getView();
        view.on('change:center', updateCoordinates);
        view.on('change:resolution', updateCoordinates);

        // Initial update
        updateCoordinates();

        return () => {
            view.un('change:center', updateCoordinates);
            view.un('change:resolution', updateCoordinates);
        };
    }, [map]);

    return coordinates;
};

// useFeatureSelection hook
export const useFeatureSelection = (map, onFeatureSelect) => {
    useEffect(async () => {
        if (!map) return;

        const selectInteraction = new (await import('ol/interaction')).Select({
            condition: (await import('ol/events/condition')).click,
            layers: async (layer) => layer instanceof (await import('ol/layer')).Vector,
        });

        selectInteraction.on('select', (event) => {
            const selectedFeatures = event.selected;
            if (selectedFeatures.length > 0 && onFeatureSelect) {
                const feature = selectedFeatures[0];
                const properties = feature.getProperties();
                onFeatureSelect(properties);
            }
        });

        map.addInteraction(selectInteraction);

        return () => {
            map.removeInteraction(selectInteraction);
        };
    }, [map, onFeatureSelect]);

    const selectFeatureById = (layer, featureId, idColumn) => {
        if (!layer) return;

        const source = layer.getSource();
        if (!source) return;

        source.forEachFeature((feature) => {
            const properties = feature.getProperties();
            if (properties[idColumn] === featureId) {
                // Trigger selection logic here if needed
                return false; // Stop iteration
            }
        });
    };

    return { selectFeatureById };
};