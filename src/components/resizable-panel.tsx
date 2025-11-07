'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type ResizablePanelProps = {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  minRightWidth?: number; // percentage
  className?: string;
};

export function ResizablePanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 70,
  minLeftWidth = 30,
  minRightWidth = 20,
  className = '',
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate new left panel width as percentage
      let newLeftWidth = (mouseX / containerWidth) * 100;

      // Apply constraints
      newLeftWidth = Math.max(minLeftWidth, Math.min(100 - minRightWidth, newLeftWidth));

      setLeftWidth(newLeftWidth);
    },
    [isDragging, minLeftWidth, minRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex gap-0 ${className}`}>
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="flex-shrink-0">
        {leftPanel}
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="group relative flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-slate-300/50 dark:hover:bg-slate-700/50"
        role="separator"
        aria-label="Resize panels"
      >
        {/* Visual indicator */}
        <div className="absolute h-full w-0.5 bg-slate-200 transition-colors group-hover:bg-slate-400 dark:bg-slate-700 dark:group-hover:bg-slate-500" />
        
        {/* Drag handle (visible on hover) */}
        <div className="absolute flex h-12 w-5 items-center justify-center rounded-full bg-slate-300/0 transition-all group-hover:bg-slate-300 dark:group-hover:bg-slate-700">
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="h-4 w-0.5 rounded-full bg-slate-500 dark:bg-slate-400" />
            <div className="h-4 w-0.5 rounded-full bg-slate-500 dark:bg-slate-400" />
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: `${100 - leftWidth}%` }} className="flex-shrink-0 overflow-hidden pl-4">
        {rightPanel}
      </div>
    </div>
  );
}

