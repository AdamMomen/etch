import React from "react";

interface AnnotationToolsProps {
  color: string;
  strokeWidth: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onClear: () => void;
  canClear: boolean;
}

const COLORS = [
  "#ff0000", // Red
  "#00ff00", // Green
  "#0000ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#000000", // Black
  "#ffffff", // White
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8];

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  color,
  strokeWidth,
  onColorChange,
  onWidthChange,
  onClear,
  canClear,
}) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Color:</label>
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded border-2 ${
                color === c ? "border-gray-900" : "border-gray-300"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Width:</label>
        <div className="flex gap-1">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => onWidthChange(w)}
              className={`px-2 py-1 rounded text-sm ${
                strokeWidth === w
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>

      {canClear && (
        <button
          onClick={onClear}
          className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

export default AnnotationTools;
