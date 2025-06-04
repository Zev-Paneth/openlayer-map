// src/services/drawing.service.js

import { Draw, Modify, Snap } from 'ol/interaction';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { WKT } from 'ol/format';
import { DRAWING_MODES } from '../constants/map.constants.js';

export class DrawingService {
    constructor() {
        this.wktFormat = new WKT();
        this.drawInteraction = null;
        this.modifyInteraction = null;
        this.snapInteraction = null;
        this.drawingLayer = this.createDrawingLayer();
    }

    /**
     * Creates dedicated layer for drawing
     */
    createDrawingLayer() {
        const source = new VectorSource();

        return new VectorLayer({
            source,
            style: this.createDrawingStyle(),
        });
    }

    /**
     * Creates style for drawing interactions
     */
    createDrawingStyle() {
        return new Style({
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
            stroke: new Stroke({
                color: '#ffcc33',
                width: 2,
                lineDash: [10, 10],
            }),
            image: new Circle({
                radius: 5,
                stroke: new Stroke({
                    color: '#ffcc33',
                }),
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 0.2)',
                }),
            }),
        });
    }

    /**
     * Starts drawing interaction
     */
    startDrawing(map, type, onDrawEnd) {
        this.stopDrawing(map);

        if (type === DRAWING_MODES.NONE) return;

        let geometryType;
        switch (type) {
            case DRAWING_MODES.POLYGON:
                geometryType = 'Polygon';
                break;
            case DRAWING_MODES.LINE:
                geometryType = 'LineString';
                break;
            case DRAWING_MODES.POINT:
                geometryType = 'Point';
                break;
            default:
                return;
        }

        this.drawInteraction = new Draw({
            source: this.drawingLayer.getSource(),
            type: geometryType,
            style: this.createDrawingStyle(),
        });

        this.drawInteraction.on('drawend', (event) => {
            if (onDrawEnd) {
                const feature = event.feature;
                const geometry = feature.getGeometry();
                if (geometry) {
                    const wkt = this.geometryToWKT(geometry);
                    onDrawEnd(wkt);
                }
            }
        });

        // Add modify interaction for editing drawn features
        this.modifyInteraction = new Modify({
            source: this.drawingLayer.getSource(),
        });

        // Add snap interaction for better user experience
        this.snapInteraction = new Snap({
            source: this.drawingLayer.getSource(),
        });

        map.addInteraction(this.drawInteraction);
        map.addInteraction(this.modifyInteraction);
        map.addInteraction(this.snapInteraction);

        // Add drawing layer to map if not already added
        if (!map.getLayers().getArray().includes(this.drawingLayer)) {
            map.addLayer(this.drawingLayer);
        }
    }

    /**
     * Stops all drawing interactions
     */
    stopDrawing(map) {
        if (this.drawInteraction) {
            map.removeInteraction(this.drawInteraction);
            this.drawInteraction = null;
        }

        if (this.modifyInteraction) {
            map.removeInteraction(this.modifyInteraction);
            this.modifyInteraction = null;
        }

        if (this.snapInteraction) {
            map.removeInteraction(this.snapInteraction);
            this.snapInteraction = null;
        }
    }

    /**
     * Clears all drawn features
     */
    clearDrawing() {
        const source = this.drawingLayer.getSource();
        if (source) {
            source.clear();
        }
    }

    /**
     * Converts geometry to WKT format
     */
    geometryToWKT(geometry) {
        // Transform to WGS84 if needed
        const clonedGeometry = geometry.clone();
        clonedGeometry.transform('EPSG:4326', 'EPSG:4326'); // Already in WGS84

        return this.wktFormat.writeGeometry(clonedGeometry);
    }

    /**
     * Gets the drawing layer
     */
    getDrawingLayer() {
        return this.drawingLayer;
    }

    /**
     * Checks if currently drawing
     */
    isDrawing() {
        return this.drawInteraction !== null;
    }

    /**
     * Formats polygon coordinates to WKT string as specified
     */
    formatPolygonToWKT(coordinates) {
        const coordString = coordinates
            .map(coord => `${coord[0]} ${coord[1]}`)
            .join(', ');

        // Close the polygon by adding the first coordinate at the end
        const firstCoord = coordinates[0];
        const closedCoordString = `${coordString}, ${firstCoord[0]} ${firstCoord[1]}`;

        return `POLYGON ((${closedCoordString}))`;
    }
}