import * as React from "react";
import { cn } from "@/lib/utils";

export interface MasonryGridProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
}

/**
 * Zero-JS responsive Masonry Grid using Tailwind CSS multi-column layout
 * (2 columns on mobile, 3 columns on desktop) with progressive enhancement
 * to native `display: grid-lanes` via `.masonry-grid` in globals.css.
 */
export function MasonryGrid<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  itemClassName,
}: MasonryGridProps<T>) {
  return (
    <div
      className={cn(
        "masonry-grid columns-2 gap-2.5 sm:gap-3.5 lg:columns-3",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className={cn(
            "masonry-item mb-2.5 sm:mb-3.5 break-inside-avoid",
            itemClassName,
          )}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
