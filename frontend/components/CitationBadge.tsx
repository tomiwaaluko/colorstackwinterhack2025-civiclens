"use client";

import { useState } from "react";
import type { UnifiedCitation } from "./EvidenceDrawer";
import EvidencePopover from "./EvidencePopover";
import { FileText, BookOpen } from "lucide-react";

interface CitationBadgeProps {
  count: number;
  citations: UnifiedCitation[];
  onViewAll: () => void;
  variant?: "default" | "compact" | "inline" | "pill";
  showIcon?: boolean;
  className?: string;
}

export default function CitationBadge({
  count,
  citations,
  onViewAll,
  variant = "default",
  showIcon = true,
  className = "",
}: CitationBadgeProps) {
  if (count === 0) return null;

  const baseClasses = "cursor-pointer transition-all";
  
  const variantClasses = {
    default: "inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 hover:border-blue-300",
    compact: "inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600",
    inline: "inline-flex items-center gap-1 text-blue-600 text-xs font-medium hover:text-blue-800 hover:underline",
    pill: "inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold hover:bg-amber-200",
  };

  const badge = (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {showIcon && variant !== "compact" && (
        variant === "pill" ? (
          <BookOpen className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )
      )}
      {variant === "compact" ? count : `${count} source${count > 1 ? "s" : ""}`}
    </span>
  );

  return (
    <EvidencePopover citations={citations} onViewAll={onViewAll}>
      {badge}
    </EvidencePopover>
  );
}

// Simpler inline version for use in text
interface InlineCitationProps {
  count: number;
  onClick: () => void;
}

export function InlineCitation({ count, onClick }: InlineCitationProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium ml-1"
    >
      <FileText className="h-3 w-3" />
      [{count}]
    </button>
  );
}

// Citation count for map overlays
interface MapCitationCountProps {
  count: number;
  onClick: () => void;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export function MapCitationCount({ count, onClick, position = "top-right" }: MapCitationCountProps) {
  if (count === 0) return null;

  const positionClasses = {
    "top-right": "top-1 right-1",
    "bottom-right": "bottom-1 right-1",
    "top-left": "top-1 left-1",
    "bottom-left": "bottom-1 left-1",
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute ${positionClasses[position]} z-10 flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 shadow-md transition-transform hover:scale-110`}
      title={`${count} source${count > 1 ? "s" : ""}`}
    >
      {count}
    </button>
  );
}
