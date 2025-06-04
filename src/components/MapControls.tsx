// src/components/MapControls.tsx

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Square, Minus, Circle } from 'lucide-react';
import type { MapControls as MapControlsType } from '../types/map.types';
import { DRAWING_MODES } from '../constants/map.constants';

interface MapControlsProps extends MapControlsType {
    onDrawingModeChange: (mode: keyof typeof DRAWING_MODES) => void;
    currentDrawingMode: keyof typeof DRAWING_MODES;
    onClearDrawing: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
                                                            zoomIn,
                                                            zoomOut,
                                                            fitToLayer,
                                                            onDrawingModeChange,
                                                            currentDrawingMode,
                                                            onClearDrawing,
                                                        }) => {
    return (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <button
                    onClick={zoomIn}
                    className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 block w-full"
                    title="התקרב"
                >
                    <ZoomIn size={18} />
                </button>
                <button
                    onClick={zoomOut}
                    className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 block w-full"
                    title="התרחק"
                >
                    <ZoomOut size={18} />
                </button>
                <button
                    onClick={fitToLayer}
                    className="p-3 hover:bg-gray-50 transition-colors block w-full"
                    title="התאם לשכבה"
                >
                    <Maximize2 size={18} />
                </button>
            </div>

            {/* Drawing Tools */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <button
                    onClick={() => onDrawingModeChange(DRAWING_MODES.POLYGON)}
                    className={`p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 block w-full ${
                        currentDrawingMode === DRAWING_MODES.POLYGON ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    title="צייר פוליגון"
                >
                    <Square size={18} />
                </button>
                <button
                    onClick={() => onDrawingModeChange(DRAWING_MODES.LINE)}
                    className={`p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 block w-full ${
                        currentDrawingMode === DRAWING_MODES.LINE ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    title="צייר קו"
                >
                    <Minus size={18} />
                </button>
                <button
                    onClick={() => onDrawingModeChange(DRAWING_MODES.POINT)}
                    className={`p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 block w-full ${
                        currentDrawingMode === DRAWING_MODES.POINT ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    title="סמן נקודה"
                >
                    <Circle size={18} />
                </button>
                <button
                    onClick={onClearDrawing}
                    className="p-3 hover:bg-red-50 hover:text-red-600 transition-colors block w-full"
                    title="נקה ציורים"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

// src/components/CoordinateDisplay.tsx

interface CoordinateDisplayProps {
    latitude: number;
    longitude: number;
    zoom: number;
    onZoomToLayer?: () => void;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
                                                                        latitude,
                                                                        longitude,
                                                                        zoom,
                                                                        onZoomToLayer,
                                                                    }) => {
    return (
        <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
            <div className="text-sm font-mono space-y-1">
                <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-600">קו רוחב:</span>
                    <span className="font-semibold">{latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-600">קו אורך:</span>
                    <span className="font-semibold">{longitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-600">זום:</span>
                    <span className="font-semibold">{zoom.toFixed(1)}</span>
                </div>
                {onZoomToLayer && (
                    <button
                        onClick={onZoomToLayer}
                        className="w-full mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        התאם לשכבה
                    </button>
                )}
            </div>
        </div>
    );
};

// src/components/BaseLayerSelector.tsx

interface BaseLayerSelectorProps {
    layers: Array<{
        id: string;
        name: string;
        active: boolean;
    }>;
    onLayerChange: (layerId: string) => void;
}

export const BaseLayerSelector: React.FC<BaseLayerSelectorProps> = ({
                                                                        layers,
                                                                        onLayerChange,
                                                                    }) => {
    return (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
                שכבות רקע
            </div>
            <div className="p-2 space-y-1">
                {layers.map((layer) => (
                    <button
                        key={layer.id}
                        onClick={() => onLayerChange(layer.id)}
                        className={`w-full text-right px-3 py-2 text-sm rounded transition-colors ${
                            layer.active
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                        {layer.name}
                    </button>
                ))}
            </div>
        </div>
    );
};