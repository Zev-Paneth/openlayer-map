// src/services/wmts-config.service.ts

/**
 * Service for managing WMTS layer configurations from your server
 * Based on the documentation you provided
 */

interface WMTSCapabilitiesResponse {
    layers: Array<{
        identifier: string;
        title: string;
        abstract?: string;
        styles: Array<{
            identifier: string;
            title: string;
        }>;
        formats: string[];
        tileMatrixSetLinks: Array<{
            tileMatrixSet: string;
        }>;
        resourceUrls?: Array<{
            format: string;
            resourceType: string;
            template: string;
        }>;
    }>;
}

interface CSWRecord {
    identifier: string;
    title: string;
    type: string;
    links: Array<{
        scheme: string;
        name: string;
        description: string;
        url: string;
    }>;
    footprint?: {
        type: string;
        coordinates: number[][][];
    };
    boundingBox?: {
        lowerCorner: [number, number];
        upperCorner: [number, number];
    };
}

export class WMTSConfigService {
    private static readonly BASE_CSW_URL = 'YOUR_RASTER_CATALOG_SERVICE_URL/csw';
    private static readonly TOKEN = 'YOUR_API_TOKEN';

    /**
     * Query CSW catalog for available raster layers
     */
    static async queryCSWCatalog(
        productType?: string,
        productId?: string,
        maxRecords: number = 10
    ): Promise<CSWRecord[]> {
        const requestBody = this.buildCSWRequest(productType, productId, maxRecords);

        try {
            const response = await fetch(this.BASE_CSW_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/xml',
                    'x-api-key': this.TOKEN,
                },
                body: requestBody,
            });

            if (!response.ok) {
                throw new Error(`CSW request failed: ${response.statusText}`);
            }

            const xmlText = await response.text();
            return this.parseCSWResponse(xmlText);
        } catch (error) {
            console.error('Failed to query CSW catalog:', error);
            throw error;
        }
    }

    /**
     * Get WMTS capabilities for a specific layer
     */
    static async getWMTSCapabilities(capabilitiesUrl: string): Promise<WMTSCapabilitiesResponse> {
        try {
            const urlWithToken = `${capabilitiesUrl}${capabilitiesUrl.includes('?') ? '&' : '?'}token=${this.TOKEN}`;

            const response = await fetch(urlWithToken, {
                method: 'GET',
                headers: {
                    'x-api-key': this.TOKEN,
                },
            });

            if (!response.ok) {
                throw new Error(`WMTS capabilities request failed: ${response.statusText}`);
            }

            const xmlText = await response.text();
            return this.parseWMTSCapabilities(xmlText);
        } catch (error) {
            console.error('Failed to get WMTS capabilities:', error);
            throw error;
        }
    }

    /**
     * Get configured base layers from your server
     */
    static async getConfiguredBaseLayers(): Promise<Array<{
        id: string;
        name: string;
        url: string;
        productType: string;
        productId: string;
    }>> {
        // These should be configured based on your server's available layers
        // You might want to make this configurable or fetch from an API
        const baseLayerConfigs = [
            {
                id: 'orthophoto-best',
                name: 'תצלום אורתופוטו איכותי',
                productType: 'OrthophotoBest',
                productId: 'ORTHOPHOTO_MOSAIC_BASE',
            },
            {
                id: 'bluemarble',
                name: 'תמונת לווין כחול שיש',
                productType: 'Raster',
                productId: 'bluemarble_5km',
            },
            // Add more base layers as needed
        ];

        const layers = [];

        for (const config of baseLayerConfigs) {
            try {
                const cswRecords = await this.queryCSWCatalog(config.productType, config.productId, 1);

                if (cswRecords.length > 0) {
                    const record = cswRecords[0];
                    const wmtsLink = record.links.find(link => link.scheme === 'WMTS');

                    if (wmtsLink) {
                        layers.push({
                            ...config,
                            url: wmtsLink.url,
                        });
                    }
                }
            } catch (error) {
                console.warn(`Failed to configure base layer ${config.id}:`, error);
            }
        }

        return layers;
    }

    /**
     * Build CSW GetRecords request XML
     */
    private static buildCSWRequest(
        productType?: string,
        productId?: string,
        maxRecords: number = 10
    ): string {
        let filterContent = '';

        if (productType || productId) {
            const filters = [];

            if (productType) {
                filters.push(`
          <PropertyIsEqualTo>
            <PropertyName>mc:productType</PropertyName>
            <Literal>${productType}</Literal>
          </PropertyIsEqualTo>`);
            }

            if (productId) {
                filters.push(`
          <PropertyIsEqualTo>
            <PropertyName>mc:productId</PropertyName>
            <Literal>${productId}</Literal>
          </PropertyIsEqualTo>`);
            }

            if (filters.length === 1) {
                filterContent = filters[0];
            } else if (filters.length > 1) {
                filterContent = `<And>${filters.join('')}</And>`;
            }

            filterContent = `
        <Constraint version="1.1.0">
          <Filter xmlns="http://www.opengis.net/ogc">
            ${filterContent}
          </Filter>
        </Constraint>`;
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords 
  xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
  service="CSW"
  maxRecords="${maxRecords}" 
  startPosition="1"
  outputSchema="http://schema.mapcolonies.com/raster" 
  version="2.0.2"
  xmlns:mc="http://schema.mapcolonies.com/raster">
  <csw:Query typeNames="mc:MCRasterRecord">
    <csw:ElementSetName>full</csw:ElementSetName>
    ${filterContent}
  </csw:Query>
</csw:GetRecords>`;
    }

    /**
     * Parse CSW GetRecords response
     */
    private static parseCSWResponse(xmlText: string): CSWRecord[] {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const records: CSWRecord[] = [];
        const recordElements = xmlDoc.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'MCRasterRecord');

        for (let i = 0; i < recordElements.length; i++) {
            const recordElement = recordElements[i];

            try {
                const record: CSWRecord = {
                    identifier: this.getElementText(recordElement, 'mc:identifier') || '',
                    title: this.getElementText(recordElement, 'mc:productName') || '',
                    type: this.getElementText(recordElement, 'mc:productType') || '',
                    links: [],
                };

                // Parse links
                const linkElements = recordElement.getElementsByTagNameNS('http://schema.mapcolonies.com/raster', 'links');
                for (let j = 0; j < linkElements.length; j++) {
                    const linkElement = linkElements[j];
                    record.links.push({
                        scheme: linkElement.getAttribute('scheme') || '',
                        name: linkElement.getAttribute('name') || '',
                        description: linkElement.getAttribute('description') || '',
                        url: linkElement.textContent || '',
                    });
                }

                // Parse footprint if available
                const footprintText = this.getElementText(recordElement, 'mc:footprint');
                if (footprintText) {
                    try {
                        record.footprint = JSON.parse(footprintText);
                    } catch (e) {
                        console.warn('Failed to parse footprint JSON:', e);
                    }
                }

                // Parse bounding box if available
                const bboxElement = recordElement.getElementsByTagNameNS('http://www.opengis.net/ows', 'BoundingBox')[0];
                if (bboxElement) {
                    const lowerCorner = this.getElementText(bboxElement, 'ows:LowerCorner');
                    const upperCorner = this.getElementText(bboxElement, 'ows:UpperCorner');

                    if (lowerCorner && upperCorner) {
                        const lower = lowerCorner.split(' ').map(Number) as [number, number];
                        const upper = upperCorner.split(' ').map(Number) as [number, number];
                        record.boundingBox = { lowerCorner: lower, upperCorner: upper };
                    }
                }

                records.push(record);
            } catch (error) {
                console.warn('Failed to parse CSW record:', error);
            }
        }

        return records;
    }

    /**
     * Parse WMTS Capabilities response
     */
    private static parseWMTSCapabilities(xmlText: string): WMTSCapabilitiesResponse {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const layers: WMTSCapabilitiesResponse['layers'] = [];
        const layerElements = xmlDoc.getElementsByTagName('Layer');

        for (let i = 0; i < layerElements.length; i++) {
            const layerElement = layerElements[i];

            try {
                const layer = {
                    identifier: this.getElementText(layerElement, 'ows:Identifier') || '',
                    title: this.getElementText(layerElement, 'ows:Title') || '',
                    abstract: this.getElementText(layerElement, 'ows:Abstract'),
                    styles: [] as Array<{ identifier: string; title: string }>,
                    formats: [] as string[],
                    tileMatrixSetLinks: [] as Array<{ tileMatrixSet: string }>,
                    resourceUrls: [] as Array<{ format: string; resourceType: string; template: string }>,
                };

                // Parse styles
                const styleElements = layerElement.getElementsByTagName('Style');
                for (let j = 0; j < styleElements.length; j++) {
                    const styleElement = styleElements[j];
                    layer.styles.push({
                        identifier: this.getElementText(styleElement, 'ows:Identifier') || '',
                        title: this.getElementText(styleElement, 'ows:Title') || '',
                    });
                }

                // Parse formats
                const formatElements = layerElement.getElementsByTagName('Format');
                for (let j = 0; j < formatElements.length; j++) {
                    layer.formats.push(formatElements[j].textContent || '');
                }

                // Parse tile matrix set links
                const tmsLinkElements = layerElement.getElementsByTagName('TileMatrixSetLink');
                for (let j = 0; j < tmsLinkElements.length; j++) {
                    const tmsElement = tmsLinkElements[j];
                    layer.tileMatrixSetLinks.push({
                        tileMatrixSet: this.getElementText(tmsElement, 'TileMatrixSet') || '',
                    });
                }

                // Parse resource URLs
                const resourceUrlElements = layerElement.getElementsByTagName('ResourceURL');
                for (let j = 0; j < resourceUrlElements.length; j++) {
                    const resourceElement = resourceUrlElements[j];
                    layer.resourceUrls.push({
                        format: resourceElement.getAttribute('format') || '',
                        resourceType: resourceElement.getAttribute('resourceType') || '',
                        template: resourceElement.getAttribute('template') || '',
                    });
                }

                layers.push(layer);
            } catch (error) {
                console.warn('Failed to parse WMTS layer:', error);
            }
        }

        return { layers };
    }

    /**
     * Helper method to get text content from XML element
     */
    private static getElementText(parent: Element, tagName: string): string | undefined {
        const elements = parent.getElementsByTagName(tagName);
        if (elements.length > 0 && elements[0].textContent) {
            return elements[0].textContent.trim();
        }

        // Try with namespace
        const namespaced = tagName.split(':');
        if (namespaced.length === 2) {
            const nsElements = parent.getElementsByTagNameNS('*', namespaced[1]);
            if (nsElements.length > 0 && nsElements[0].textContent) {
                return nsElements[0].textContent.trim();
            }
        }

        return undefined;
    }

    /**
     * Format WMTS URL template with proper parameters
     */
    static formatWMTSUrl(templateUrl: string, token: string): string {
        return templateUrl
                .replace('{TileMatrixSet}', 'WorldCRS84')
                .replace('{TileMatrix}', '{z}')
                .replace('{TileCol}', '{x}')
                .replace('{TileRow}', '{y}')
            + `${templateUrl.includes('?') ? '&' : '?'}token=${token}`;
    }

    /**
     * Extract bounding box from footprint
     */
    static extractBoundingBox(footprint: any): [number, number, number, number] | null {
        if (!footprint || footprint.type !== 'Polygon' || !footprint.coordinates?.[0]) {
            return null;
        }

        const coordinates = footprint.coordinates[0];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        coordinates.forEach(([x, y]: [number, number]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        return [minX, minY, maxX, maxY];
    }
}