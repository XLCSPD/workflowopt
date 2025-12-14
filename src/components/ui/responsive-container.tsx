import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add horizontal padding on mobile
   * @default true
   */
  padded?: boolean;
  /**
   * Maximum width of the container
   * @default "7xl"
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

/**
 * A responsive container that adapts to screen size
 * Provides consistent padding and max-width across the app
 */
const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, padded = true, maxWidth = "7xl", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        padded && "px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ResponsiveContainer.displayName = "ResponsiveContainer";

/**
 * A grid container that adapts columns based on screen size
 */
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns on mobile
   * @default 1
   */
  cols?: 1 | 2;
  /**
   * Number of columns on tablet (sm)
   * @default 2
   */
  smCols?: 1 | 2 | 3;
  /**
   * Number of columns on desktop (md)
   * @default 3
   */
  mdCols?: 1 | 2 | 3 | 4;
  /**
   * Number of columns on large screens (lg)
   * @default 4
   */
  lgCols?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Gap between items
   * @default 4
   */
  gap?: 2 | 3 | 4 | 6 | 8;
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ 
    className, 
    cols = 1, 
    smCols = 2, 
    mdCols = 3, 
    lgCols = 4, 
    gap = 4,
    children, 
    ...props 
  }, ref) => {
    const colClasses = {
      1: "grid-cols-1",
      2: "grid-cols-2",
    };

    const smColClasses = {
      1: "sm:grid-cols-1",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-3",
    };

    const mdColClasses = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    };

    const lgColClasses = {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
      6: "lg:grid-cols-6",
    };

    const gapClasses = {
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colClasses[cols],
          smColClasses[smCols],
          mdColClasses[mdCols],
          lgColClasses[lgCols],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveGrid.displayName = "ResponsiveGrid";

/**
 * Hide content on specific breakpoints
 */
interface HideOnProps {
  children: React.ReactNode;
  breakpoint: "mobile" | "tablet" | "desktop";
}

function HideOn({ children, breakpoint }: HideOnProps) {
  const classes = {
    mobile: "hidden sm:block",
    tablet: "block sm:hidden md:block",
    desktop: "block md:hidden",
  };

  return <div className={classes[breakpoint]}>{children}</div>;
}

/**
 * Show content only on specific breakpoints
 */
interface ShowOnProps {
  children: React.ReactNode;
  breakpoint: "mobile" | "tablet" | "desktop";
}

function ShowOn({ children, breakpoint }: ShowOnProps) {
  const classes = {
    mobile: "block sm:hidden",
    tablet: "hidden sm:block md:hidden",
    desktop: "hidden md:block",
  };

  return <div className={classes[breakpoint]}>{children}</div>;
}

export { ResponsiveContainer, ResponsiveGrid, HideOn, ShowOn };

