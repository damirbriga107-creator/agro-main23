import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

const VirtualizedList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  className = '',
  overscan = 3,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const getItemHeight = useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index, items[index]);
      }
      return itemHeight;
    },
    [itemHeight, items]
  );

  const { totalHeight, visibleItems } = useMemo(() => {
    if (loading || items.length === 0) {
      return { totalHeight: 0, visibleItems: [] };
    }

    let accumulatedHeight = 0;
    const heights: number[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      heights.push(height);
      accumulatedHeight += height;
    }

    let startIndex = 0;
    let currentHeight = 0;
    
    // Find start index
    for (let i = 0; i < heights.length; i++) {
      if (currentHeight + heights[i] > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      currentHeight += heights[i];
    }

    let endIndex = startIndex;
    let visibleHeight = 0;
    currentHeight = heights.slice(0, startIndex).reduce((sum, h) => sum + h, 0);

    // Find end index
    for (let i = startIndex; i < heights.length; i++) {
      if (visibleHeight > containerHeight + overscan * (heights[i] || getItemHeight(i))) {
        break;
      }
      visibleHeight += heights[i];
      endIndex = i;
    }

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: heights.slice(0, startIndex + index).reduce((sum, h) => sum + h, 0),
      height: heights[startIndex + index],
    }));

    return {
      totalHeight: accumulatedHeight,
      visibleItems,
    };
  }, [items, scrollTop, containerHeight, getItemHeight, overscan, loading]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      setIsScrolling(true);
      onScroll?.(newScrollTop);

      // Clear scrolling state after scroll ends
      const timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      return () => clearTimeout(timeoutId);
    },
    [onScroll]
  );

  // Loading state
  if (loading && loadingComponent) {
    return (
      <div className={`relative ${className}`} style={{ height: containerHeight }}>
        {loadingComponent}
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && emptyComponent) {
    return (
      <div className={`relative ${className}`} style={{ height: containerHeight }}>
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top, height }) => (
          <div
            key={keyExtractor(item, index)}
            className={`absolute left-0 right-0 ${isScrolling ? 'pointer-events-none' : ''}`}
            style={{
              top,
              height,
              transform: 'translateZ(0)', // Force GPU acceleration
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualizedList;