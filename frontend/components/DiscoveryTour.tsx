"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Network,
  PieChart,
  Sparkles,
  Lightbulb,
  CheckCircle,
} from "lucide-react";

export interface TourStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  action?: string; // Optional action button text
  onAction?: () => void;
}

interface DiscoveryTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  storageKey?: string; // For localStorage to track if tour was completed
}

export default function DiscoveryTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  storageKey = "civiclens-tour-completed",
}: DiscoveryTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Find and highlight the target element
  useEffect(() => {
    if (!isOpen || !step) return;

    const findTarget = () => {
      let element: Element | null = null;

      // Try ID first
      if (step.target.startsWith("#")) {
        element = document.getElementById(step.target.slice(1));
      } else {
        // Try query selector
        element = document.querySelector(step.target);
      }

      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll element into view
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Add highlight class
        element.classList.add("tour-highlight");

        return () => {
          element?.classList.remove("tour-highlight");
        };
      }
    };

    const cleanup = findTarget();

    // Also try after a short delay in case of dynamic content
    const timer = setTimeout(findTarget, 500);

    return () => {
      cleanup?.();
      clearTimeout(timer);
    };
  }, [isOpen, step, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && !isLastStep) {
        setCurrentStep((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        setCurrentStep((prev) => prev - 1);
      } else if (e.key === "Enter" && isLastStep) {
        handleComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, onClose]);

  const handleComplete = useCallback(() => {
    // Save completion to localStorage
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    onComplete?.();
    onClose();
  }, [storageKey, onComplete, onClose]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen || !step) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 20;
    const position = step.position || "bottom";

    switch (position) {
      case "top":
        return {
          position: "fixed",
          bottom: `${window.innerHeight - targetRect.top + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          position: "fixed",
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          position: "fixed",
          top: `${targetRect.top + targetRect.height / 2}px`,
          right: `${window.innerWidth - targetRect.left + padding}px`,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          position: "fixed",
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: "translateY(-50%)",
        };
      default:
        return {
          position: "fixed",
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Spotlight cutout */}
      {targetRect && (
        <div
          className="fixed z-[101] rounded-lg ring-4 ring-blue-500 ring-offset-4 pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[102] w-80 bg-white rounded-xl shadow-2xl border-2 border-blue-500 overflow-hidden"
        style={getTooltipStyle()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step.icon || <Sparkles className="h-5 w-5" />}
              <span className="font-semibold" id="tour-title">
                {step.title}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            {step.description}
          </p>

          {step.action && step.onAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={step.onAction}
              className="mt-3 w-full"
            >
              {step.action}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Global style for highlighting */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 101;
        }
      `}</style>
    </>
  );
}

// Pre-built tour steps for the visualizations page
export const VISUALIZATION_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "#visualization-content",
    title: "Welcome to CivicLens",
    description:
      "Explore political data through interactive visualizations. This tour will guide you through the key features.",
    icon: <Sparkles className="h-5 w-5" />,
    position: "bottom",
  },
  {
    id: "tabs",
    target: "[role='tablist']",
    title: "Visualization Types",
    description:
      "Switch between different visualization types: Donations Map, Timeline, Network Graph, and Radial Chart. Each offers a unique perspective on the data.",
    icon: <PieChart className="h-5 w-5" />,
    position: "bottom",
  },
  {
    id: "map",
    target: "[value='map']",
    title: "Donations Map",
    description:
      "See where political donations come from across the United States. Use the time slider to animate changes over years, or compare multiple politicians.",
    icon: <MapPin className="h-5 w-5" />,
    position: "bottom",
  },
  {
    id: "timeline",
    target: "[value='timeline']",
    title: "Timeline View",
    description:
      "Track events over time - votes, donations, and statements. Click events to see related activity and discover correlations.",
    icon: <Clock className="h-5 w-5" />,
    position: "bottom",
  },
  {
    id: "network",
    target: "[value='network']",
    title: "Network Graph",
    description:
      "Explore connections between politicians, donors, and bills. Use Influence Path mode to trace how money flows to legislation.",
    icon: <Network className="h-5 w-5" />,
    position: "bottom",
  },
  {
    id: "accessibility",
    target: "[aria-label='Accessibility options']",
    title: "Accessibility Options",
    description:
      "Toggle high-contrast mode for better visibility, or enable screen reader announcements. We're committed to making civic data accessible to everyone.",
    icon: <Lightbulb className="h-5 w-5" />,
    position: "bottom",
  },
];

// Hook to manage tour state
export function useDiscoveryTour(
  storageKey: string = "civiclens-tour-completed"
) {
  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default true to prevent flash

  useEffect(() => {
    // Check localStorage on mount
    const seen = localStorage.getItem(storageKey) === "true";
    setHasSeenTour(seen);
  }, [storageKey]);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const closeTour = useCallback(() => {
    setShowTour(false);
  }, []);

  const completeTour = useCallback(() => {
    setHasSeenTour(true);
    localStorage.setItem(storageKey, "true");
    setShowTour(false);
  }, [storageKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasSeenTour(false);
  }, [storageKey]);

  return {
    showTour,
    hasSeenTour,
    startTour,
    closeTour,
    completeTour,
    resetTour,
  };
}
