"use client";

import { useState } from "react";
import type { UnifiedCitation } from "./EvidenceDrawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, ChevronRight } from "lucide-react";

interface EvidencePopoverProps {
  citations: UnifiedCitation[];
  onViewAll: () => void;
  children: React.ReactNode;
  maxPreview?: number;
}

export default function EvidencePopover({
  citations,
  onViewAll,
  children,
  maxPreview = 3,
}: EvidencePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (citations.length === 0) {
    return <>{children}</>;
  }

  const previewCitations = citations.slice(0, maxPreview);
  const remainingCount = citations.length - maxPreview;

  const getSourceTypeColor = (sourceType?: string): string => {
    const colors: Record<string, string> = {
      congressional_record: "bg-blue-100 text-blue-800",
      fec_filing: "bg-green-100 text-green-800",
      news_article: "bg-amber-100 text-amber-800",
      press_release: "bg-purple-100 text-purple-800",
      official_statement: "bg-pink-100 text-pink-800",
    };
    return colors[sourceType || ""] || "bg-gray-100 text-gray-800";
  };

  const getSourceTypeLabel = (sourceType?: string): string => {
    const labels: Record<string, string> = {
      congressional_record: "Congress",
      fec_filing: "FEC",
      news_article: "News",
      press_release: "Press",
      official_statement: "Official",
    };
    return labels[sourceType || ""] || "Doc";
  };

  const isValidUrl = (urlString?: string): boolean => {
    if (!urlString) return false;
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Source Evidence
            </span>
            <Badge variant="secondary" className="text-xs">
              {citations.length} source{citations.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {previewCitations.map((citation, idx) => (
            <div
              key={`${citation.source_id}-${idx}`}
              className="p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-2">
                {citation.source_type && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs shrink-0 ${getSourceTypeColor(citation.source_type)}`}
                  >
                    {getSourceTypeLabel(citation.source_type)}
                  </Badge>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {citation.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {citation.publisher}
                  </p>
                  {citation.snippet && (
                    <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                      &quot;{citation.snippet}&quot;
                    </p>
                  )}
                </div>
                {isValidUrl(citation.url) && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="p-3 border-t bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setIsOpen(false);
              onViewAll();
            }}
          >
            View all evidence ({citations.length})
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
