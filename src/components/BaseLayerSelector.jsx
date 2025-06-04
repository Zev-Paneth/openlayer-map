

// src/components/BaseLayerSelector.jsx

export const BaseLayerSelector = ({
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