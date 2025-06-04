// Example usage in your application

import React, { useState, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import type { GeoJsonLayer } from './types/map.types';

// Example parent component
const App: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<any>(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState<string | number | undefined>();

    // Example GeoJSON data
    const sampleMainLayer: GeoJsonLayer = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [35.2137, 31.7683], // Tel Aviv
                },
                properties: {
                    'מזהה רשימה': '001',
                    name: 'תל אביב',
                    'עבר עבודה': false,
                },
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [35.2, 31.75],
                        [35.25, 31.75],
                        [35.25, 31.8],
                        [35.2, 31.8],
                        [35.2, 31.75],
                    ]],
                },
                properties: {
                    'מזהה רשימה': '002',
                    name: 'אזור תל אביב',
                    'עבר עבודה': true,
                },
            },
        ],
    };

    const handleEntitySelection = useCallback((entity: any) => {
        setSelectedEntity(entity);
        console.log('Selected entity:', entity);
    }, []);

    const handlePolygonDraw = useCallback((wkt: string | null) => {
        if (wkt) {
            console.log('Drawn polygon WKT:', wkt);
            // Send to your external function
        } else {
            console.log('Drawing cleared');
        }
    }, []);

    // Custom entity color function
    const entityColor = useCallback((entity: any, defaultColor: string) => {
        const isWorkedOn = entity['עבר עבודה'];

        return {
            fillColor: isWorkedOn ? '#ff6b6b' : defaultColor,
            fillOpacity: isWorkedOn ? 0.5 : 1,
            strokeColor: isWorkedOn ? '#ff5252' : defaultColor,
            strokeWidth: 2,
            strokeOpacity: 1,
        };
    }, []);

    return (
        <div className="w-full h-screen">
            <div className="h-full">
                <MapComponent
                    mainLayer={sampleMainLayer}
                    layerCenter={[35.2137, 31.7683]}
                    selectedRowIndex={selectedRowIndex}
                    setSelectedEntity={handleEntitySelection}
                    layerName="sample-layer"
                    otherLayersGeometry={null}
                    onPolygonDraw={handlePolygonDraw}
                    entityIdColumn="מזהה רשימה"
                    entityColor={entityColor}
                />
            </div>

            {/* Example controls */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white p-4 rounded-lg shadow-lg">
                <h3 className="font-bold mb-2">בקרה</h3>
                <div className="space-y-2">
                    <button
                        onClick={() => setSelectedRowIndex('001')}
                        className="block w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        בחר תל אביב
                    </button>
                    <button
                        onClick={() => setSelectedRowIndex('002')}
                        className="block w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        בחר אזור תל אביב
                    </button>
                    <button
                        onClick={() => setSelectedRowIndex(undefined)}
                        className="block w-full px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        בטל בחירה
                    </button>
                </div>

                {selectedEntity && (
                    <div className="mt-4 p-2 bg-gray-100 rounded">
                        <p className="text-sm font-semibold">ישות נבחרת:</p>
                        <p className="text-xs">{JSON.stringify(selectedEntity, null, 2)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;

// package.json dependencies you'll need to install:
/*
{
  "dependencies": {
    "ol": "^8.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "@types/ol": "^6.5.3",
    "typescript": "^5.0.0"
  }
}
*/

// Installation commands:
// npm install ol @types/ol lucide-react

// CSS you might want to add to your global styles:
/*
.ol-viewport {
  border-radius: 8px;
}

.ol-control {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px);
  border-radius: 6px !important;
}

.ol-control button {
  background: transparent !important;
  color: #374151 !important;
}

.ol-control button:hover {
  background: rgba(59, 130, 246, 0.1) !important;
  color: #2563eb !important;
}
*/