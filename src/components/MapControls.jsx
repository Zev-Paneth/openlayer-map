// src/components/MapControls.jsx

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Square, Minus, Circle } from 'lucide-react';
import { DRAWING_MODES } from '../constants/map.constants.js';

export const MapControls = ({
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
