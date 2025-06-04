
// src/components/CoordinateDisplay.jsx

export const CoordinateDisplay = ({
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