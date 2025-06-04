// src/services/wmts.service.js

import { WMTS, TileGrid } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { get as getProjection } from 'ol/proj';
import { MAP_CONSTANTS } from '../constants/map.constants.js';

export class WMTSService {
    static TOKEN = 'YOUR_TOKEN_HERE'; // Replace with actual token

    /**
     * Creates WMTS tile grid for WorldCRS84
     */
    static createTileGrid() {
        const projection = getProjection('EPSG:4326');
        const projectionExtent = projection.getExtent();
        const size = Math.max(
            projectionExtent[2] - projectionExtent[0],
            projectionExtent[3] - projectionExtent[1]
        );

        const resolutions = new Array(MAP_CONSTANTS.MAX_ZOOM);
        const matrixIds = new Array(MAP_CONSTANTS.MAX_ZOOM);

        for (let z = 0; z < MAP_CONSTANTS.MAX_ZOOM; ++z) {
            resolutions[z] = size / (MAP_CONSTANTS.TILE_SIZE * Math.pow(2, z));
            matrixIds[z] = z.toString();
        }

        return new WMTSTileGrid({
            origin: [-180, 90],
            resolutions,
            matrixIds,
        });
    }

    /**
     * Creates WMTS layer from configuration
     */
    static createWMTSLayer(config) {
        const tileGrid = this.createTileGrid();

        // Format URL template for WMTS
        const formattedUrl = config.url
            .replace('{TileMatrixSet}', MAP_CONSTANTS.TILE_MATRIX_SET)
            .replace('{TileMatrix}', '{z}')
            .replace('{TileCol}', '{x}')
            .replace('{TileRow}', '{y}');

        const source = new WMTS({
            url: formattedUrl,
            layer: config.id,
            matrixSet: MAP_CONSTANTS.TILE_MATRIX_SET,
            format: 'image/jpeg',
            projection: 'EPSG:4326',
            tileGrid,
            style: 'default',
            urls: [`${formattedUrl}?token=${this.TOKEN}`],
        });

        return new TileLayer({
            source,
            visible: config.visible ?? false,
        });
    }

    /**
     * Updates token for all WMTS sources
     */
    static updateToken(layers, newToken) {
        layers.forEach(layer => {
            const source = layer.getSource();
            if (source instanceof WMTS) {
                const currentUrls = source.getUrls();
                if (currentUrls) {
                    const updatedUrls = currentUrls.map(url =>
                        url.replace(/token=[^&]*/, `token=${newToken}`)
                    );
                    source.setUrls(updatedUrls);
                }
            }
        });
    }

    /**
     * Validates WMTS URL format
     */
    static validateWMTSUrl(url) {
        const requiredParams = ['{TileMatrixSet}', '{TileMatrix}', '{TileCol}', '{TileRow}'];
        return requiredParams.every(param => url.includes(param));
    }
}