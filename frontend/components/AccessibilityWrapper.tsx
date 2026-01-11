"use client";

import { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Contrast, Volume2, VolumeX } from "lucide-react";

// Accessibility context
interface AccessibilityContextType {
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  announcements: boolean;
  setAnnouncements: (value: boolean) => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}

// Provider component
interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [highContrast, setHighContrast] = useState(false);
  const [announcements, setAnnouncements] = useState(true);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"polite" | "assertive">("polite");

  // Announce messages to screen readers
  const announce = useCallback((msg: string, p: "polite" | "assertive" = "polite") => {
    if (!announcements) return;
    setPriority(p);
    setMessage("");
    // Small delay to ensure the change is picked up
    setTimeout(() => setMessage(msg), 100);
  }, [announcements]);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{ highContrast, setHighContrast, announcements, setAnnouncements, announce }}
    >
      {children}
      {/* Live region for announcements */}
      <div
        role="status"
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AccessibilityContext.Provider>
  );
}

// Accessibility toolbar component
export function AccessibilityToolbar() {
  const { highContrast, setHighContrast, announcements, setAnnouncements, announce } =
    useAccessibility();

  return (
    <div 
      className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg"
      role="toolbar"
      aria-label="Accessibility options"
    >
      <Button
        variant={highContrast ? "default" : "outline"}
        size="sm"
        onClick={() => {
          setHighContrast(!highContrast);
          announce(highContrast ? "High contrast mode disabled" : "High contrast mode enabled");
        }}
        aria-pressed={highContrast}
        className="gap-2"
      >
        <Contrast className="h-4 w-4" />
        High Contrast
      </Button>
      <Button
        variant={announcements ? "default" : "outline"}
        size="sm"
        onClick={() => setAnnouncements(!announcements)}
        aria-pressed={announcements}
        className="gap-2"
      >
        {announcements ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        Announcements
      </Button>
    </div>
  );
}

// Skip to content link
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      Skip to main content
    </a>
  );
}

// Visualization description for screen readers
interface VisualizationDescriptionProps {
  title: string;
  description: string;
  dataPoints?: number;
  interactionHints?: string[];
}

export function VisualizationDescription({
  title,
  description,
  dataPoints,
  interactionHints = [],
}: VisualizationDescriptionProps) {
  return (
    <div className="sr-only" role="region" aria-label={`${title} description`}>
      <h2>{title}</h2>
      <p>{description}</p>
      {dataPoints !== undefined && (
        <p>This visualization contains {dataPoints} data points.</p>
      )}
      {interactionHints.length > 0 && (
        <>
          <h3>Interaction hints:</h3>
          <ul>
            {interactionHints.map((hint, idx) => (
              <li key={idx}>{hint}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Focus trap for modals/drawers
interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
    };

    // Focus the first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, onEscape]);

  return <div ref={containerRef}>{children}</div>;
}

// Keyboard navigation helper hook
export function useKeyboardNavigation<T>(
  items: T[],
  options?: {
    onSelect?: (item: T, index: number) => void;
    onEscape?: () => void;
    vertical?: boolean;
    wrap?: boolean;
  }
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { onSelect, onEscape, vertical = true, wrap = true } = options || {};

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = vertical ? "ArrowDown" : "ArrowRight";

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev <= 0) return wrap ? items.length - 1 : 0;
            return prev - 1;
          });
          break;
        case nextKey:
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev >= items.length - 1) return wrap ? 0 : items.length - 1;
            return prev + 1;
          });
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && onSelect) {
            onSelect(items[focusedIndex], focusedIndex);
          }
          break;
        case "Escape":
          if (onEscape) {
            onEscape();
          }
          break;
      }
    },
    [items, focusedIndex, onSelect, onEscape, vertical, wrap]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getItemProps: (index: number) => ({
      tabIndex: index === focusedIndex || (focusedIndex === -1 && index === 0) ? 0 : -1,
      "aria-selected": index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
    }),
  };
}

// Roving tabindex for lists
interface RovingTabIndexProps {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  label: string;
}

export function RovingTabIndex({
  children,
  orientation = "vertical",
  label,
}: RovingTabIndexProps) {
  return (
    <div
      role="listbox"
      aria-label={label}
      aria-orientation={orientation}
      className="focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 rounded-lg"
    >
      {children}
    </div>
  );
}

// Accessible color indicator
interface ColorIndicatorProps {
  color: string;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function ColorIndicator({ color, label, size = "md" }: ColorIndicatorProps) {
  const sizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={`inline-block ${sizes[size]} rounded`}
      style={{ backgroundColor: color }}
      role="img"
      aria-label={`Color indicator: ${label}`}
    />
  );
}
