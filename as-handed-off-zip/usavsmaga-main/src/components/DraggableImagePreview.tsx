import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

interface DraggableImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  onZoomClick?: () => void;
  isLoading?: boolean;
  loadingOverlay?: React.ReactNode;
  objectFit?: 'contain' | 'cover';
}

export const DraggableImagePreview: React.FC<DraggableImagePreviewProps> = ({
  src,
  alt = 'Preview',
  className = '',
  containerClassName = '',
  onZoomClick,
  isLoading = false,
  loadingOverlay,
  objectFit = 'contain',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialFit, setInitialFit] = useState<'width' | 'height'>('width');

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = src;
  }, [src]);

  // Measure container and calculate initial fit
  useEffect(() => {
    if (!containerRef.current || imageDimensions.width === 0) return;
    
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
      
      // Determine fit based on aspect ratios
      const containerAspect = rect.width / rect.height;
      const imageAspect = imageDimensions.width / imageDimensions.height;
      
      // If image is wider than container, fit to width; otherwise fit to height
      setInitialFit(imageAspect > containerAspect ? 'width' : 'height');
    };
    
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [imageDimensions]);

  // Reset view when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  // Calculate display size based on longer dimension
  const getDisplayStyle = useCallback(() => {
    if (imageDimensions.width === 0 || containerSize.width === 0) {
      return { width: '100%', height: '100%' };
    }

    const imageAspect = imageDimensions.width / imageDimensions.height;
    const containerAspect = containerSize.width / containerSize.height;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to container width
      return {
        width: containerSize.width * scale,
        height: (containerSize.width / imageAspect) * scale,
      };
    } else {
      // Image is taller - fit to container height
      return {
        width: containerSize.height * imageAspect * scale,
        height: containerSize.height * scale,
      };
    }
  }, [imageDimensions, containerSize, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // Only allow drag when zoomed
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(s => Math.min(s + 0.25, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(s => Math.max(s - 0.25, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.min(Math.max(s + delta, 0.5), 4));
  };

  const displayStyle = getDisplayStyle();

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-diesel-dark/50 ${containerClassName}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          scale > 1 ? 'cursor-grab' : 'cursor-default'
        } ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`select-none transition-opacity ${isLoading ? 'opacity-40' : ''} ${className}`}
          style={{
            width: objectFit === 'cover' ? '100%' : (typeof displayStyle.width === 'number' ? `${displayStyle.width}px` : displayStyle.width),
            height: objectFit === 'cover' ? '100%' : (typeof displayStyle.height === 'number' ? `${displayStyle.height}px` : displayStyle.height),
            transform: `translate(${position.x}px, ${position.y}px)`,
            objectFit,
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && loadingOverlay}

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-diesel-panel/80 backdrop-blur-sm border border-diesel-border p-1 rounded">
        <button
          onClick={handleZoomOut}
          className="p-1 text-diesel-steel hover:text-diesel-gold transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-diesel-steel min-w-[32px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 text-diesel-steel hover:text-diesel-gold transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleReset}
          className="p-1 text-diesel-steel hover:text-diesel-gold transition-colors"
          title="Reset View"
        >
          <RotateCcw size={14} />
        </button>
        {onZoomClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onZoomClick(); }}
            className="p-1 text-diesel-steel hover:text-diesel-gold transition-colors border-l border-diesel-border ml-1 pl-2"
            title="Full View"
          >
            <Move size={14} />
          </button>
        )}
      </div>

      {/* Zoom indicator when zoomed */}
      {scale > 1 && !isDragging && (
        <div className="absolute top-2 left-2 text-[10px] text-diesel-steel bg-diesel-panel/60 px-2 py-0.5 border border-diesel-border">
          Drag to pan
        </div>
      )}
    </div>
  );
};
