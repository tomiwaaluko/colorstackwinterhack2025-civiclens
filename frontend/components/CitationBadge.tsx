"use client";

import { ExternalLink, Calendar, Building } from "lucide-react";
import type { Citation } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CitationBadgeProps {
  citation: Citation;
  index?: number;
}

export function CitationBadge({ citation, index }: CitationBadgeProps) {
  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                className="citation-badge cursor-pointer hover:bg-accent/30 transition-colors"
                aria-label={`Open citation ${index ?? 1}`}
              >
                <span>[{index ?? 1}]</span>
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Click to view source</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Source Citation</DialogTitle>
          <DialogDescription>
            Verified data source for this information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Title</p>
              <p className="text-sm text-muted-foreground">{citation.title}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Publisher</p>
              <p className="text-sm text-muted-foreground">{citation.publisher}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Retrieved At</p>
              <p className="text-sm text-muted-foreground">
                {new Date(citation.retrieved_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {citation.snippet && (
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Snippet</p>
                <p className="text-sm text-muted-foreground italic">
                  {citation.snippet}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">URL</p>
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {citation.url}
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a href={citation.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Source
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
