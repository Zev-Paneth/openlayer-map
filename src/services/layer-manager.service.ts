// src/services/layer-manager.service.ts

import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource, WMTS } from 'ol/source';
import { GeoJSON } from 'ol/format';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { Feature } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import type { GeoJsonLayer, StyleConfig } from '../types/map.types';
import { DEFAULT_STYLES } from '../constants/map.constants';

export class LayerManager {
    private geoJsonFormat = new GeoJSON();

    /**
     * Creates vector layer from GeoJSON data
     */
    createVectorLayer(
        geoJsonData: GeoJsonLayer,
        layerName: string,
        styleFunction?: (feature: Feature, defaultColor: string) => StyleConfig
    ): VectorLayer<VectorSource> {
        const vectorSource = new VectorSource({
            features: this.geoJsonFormat.readFeatures(geoJsonData, {
                featureProjection: 'EPSG:4326',
            }),
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature) => this.createFeatureStyle(feature, styleFunction),
        });

        vectorLayer.set('name', layerName);
        return vectorLayer;
    }

    /**
     * Creates OpenLayers style from configuration
     */
    private createFeatureStyle(
        feature: Feature,
        styleFunction?: (feature: Feature, defaultColor: string) => StyleConfig
    ): Style {
        const defaultColor = DEFAULT_STYLES.FILL_COLOR;

        let styleConfig: StyleConfig = {
            fillColor: defaultColor,
            fillOpacity: DEFAULT_STYLES.FILL_OPACITY,
            strokeColor: DEFAULT_STYLES.STROKE_COLOR,
            strokeWidth: DEFAULT_STYLES.STROKE_WIDTH,
            strokeOpacity: DEFAULT_STYLES.STROKE_OPACITY,
        };

        if (styleFunction) {
            styleConfig = styleFunction(feature, defaultColor);
        }

        const geometry = feature.getGeometry();
        const geometryType = geometry?.getType();

        switch (geometryType) {
            case 'Point':
                return new Style({
                    image: new Circle({
                        radius: 6,
                        fill: new Fill({
                            color: this.hexToRgba(styleConfig.fillColor, styleConfig.fillOpacity),
                        }),
                        stroke: new Stroke({
                            color: this.hexToRgba(
                                styleConfig.strokeColor || styleConfig.fillColor,
                                styleConfig.strokeOpacity || 1
                            ),
                            width: styleConfig.strokeWidth || 2,
                        }),
                    }),
                });

            case 'LineString':
            case 'MultiLineString':
                return new Style({
                    stroke: new Stroke({
                        color: this.hexToRgba(
                            styleConfig.strokeColor || styleConfig.fillColor,
                            styleConfig.strokeOpacity || 1
                        ),
                        width: styleConfig.strokeWidth || 2,
                    }),
                });

            case 'Polygon':
            case 'MultiPolygon':
                return new Style({
                    fill: new Fill({
                        color: this.hexToRgba(styleConfig.fillColor, styleConfig.fillOpacity),
                    }),
                    stroke: new Stroke({
                        color: this.hexToRgba(
                            styleConfig.strokeColor || styleConfig.fillColor,
                            styleConfig.strokeOpacity || 1
                        ),
                        width: styleConfig.strokeWidth || 2,
                    }),
                });

            default:
                return new Style({
                    fill: new Fill({
                        color: this.hexToRgba(styleConfig.fillColor, styleConfig.fillOpacity),
                    }),
                    stroke: new Stroke({
                        color: this.hexToRgba(
                            styleConfig.strokeColor || styleConfig.fillColor,
                            styleConfig.strokeOpacity || 1
                        ),
                        width: styleConfig.strokeWidth || 2,
                    }),
                });
        }
    }

    /**
     * Converts hex color to rgba with opacity
     */
    private hexToRgba(hex: string, opacity: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    /**
     * Highlights selected feature
     */
    highlightFeature(layer: VectorLayer<VectorSource>, featureId: string | number, idColumn: string): void {
        const source = layer.getSource();
        if (!source) return;

        source.forEachFeature((feature) => {
            const properties = feature.getProperties();
            const isSelected = properties[idColumn] === featureId;

            if (isSelected) {
                feature.setStyle(this.createHighlightStyle());
            } else {
                feature.setStyle(undefined); // Reset to layer default style
            }
        });
    }

    /**
     * Creates highlight style for selected features
     */
    private createHighlightStyle(): Style {
        return new Style({
            fill: new Fill({
                color: this.hexToRgba(DEFAULT_STYLES.SELECTED_FILL_COLOR, DEFAULT_STYLES.HIGHLIGHT_FILL_OPACITY),
            }),
            stroke: new Stroke({
                color: DEFAULT_STYLES.SELECTED_STROKE_COLOR,
                width: DEFAULT_STYLES.STROKE_WIDTH + 1,
            }),
            image: new Circle({
                radius: 8,
                fill: new Fill({
                    color: this.hexToRgba(DEFAULT_STYLES.SELECTED_FILL_COLOR, DEFAULT_STYLES.HIGHLIGHT_FILL_OPACITY),
                }),
                stroke: new Stroke({
                    color: DEFAULT_STYLES.SELECTED_STROKE_COLOR,
                    width: DEFAULT_STYLES.STROKE_WIDTH + 1,
                }),
            }),
        });
    }

    /**
     * Fits map view to layer extent
     */
    fitToLayerExtent(map: any, layer: VectorLayer<VectorSource>): void {
        const source = layer.getSource();
        if (!source) return;

        const extent = source.getExtent();
        if (extent && extent.every(coord => isFinite(coord))) {
            map.getView().fit(extent, {
                duration: 1000,
                padding: [20, 20, 20, 20],
            });
        }
    }
}