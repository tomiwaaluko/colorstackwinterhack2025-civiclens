"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  BookOpen,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export interface StoryStep {
  id: string;
  title: string;
  narrative: string;
  dataHighlight?: {
    type: "map" | "timeline" | "network" | "radial";
    config: any; // Visualization-specific config
  };
  insight?: string;
  caveat?: string;
  citation?: {
    title: string;
    url?: string;
  };
  duration?: number; // Seconds to show this step (for auto-play)
}

export interface Story {
  id: string;
  title: string;
  description: string;
  author?: string;
  publishedAt?: string;
  estimatedTime: string;
  steps: StoryStep[];
  tags?: string[];
}

interface StorySequenceProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onStepChange?: (step: StoryStep, index: number) => void;
  autoPlaySpeed?: number; // Seconds between steps
}

export default function StorySequence({
  story,
  isOpen,
  onClose,
  onStepChange,
  autoPlaySpeed = 5,
}: StorySequenceProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const step = story.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === story.steps.length - 1;
  const stepDuration = step?.duration || autoPlaySpeed;

  // Notify parent of step changes
  useEffect(() => {
    if (step && onStepChange) {
      onStepChange(step, currentStep);
    }
  }, [step, currentStep, onStepChange]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (stepDuration * 10));
        if (newProgress >= 100) {
          // Move to next step
          if (!isLastStep) {
            setCurrentStep((s) => s + 1);
          } else {
            setIsPlaying(false);
          }
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isOpen, stepDuration, isLastStep]);

  // Reset progress when step changes
  useEffect(() => {
    setProgress(0);
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && !isLastStep) {
        goToNext();
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        goToPrev();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, isPlaying, onClose]);

  const goToNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
      setProgress(0);
    }
  }, [isLastStep]);

  const goToPrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
      setProgress(0);
    }
  }, [isFirstStep]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (!isOpen || !step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      {/* Story panel at bottom */}
      <Card className="w-full max-w-3xl shadow-2xl border-2 border-gray-200 pointer-events-auto animate-in slide-in-from-bottom-4">
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">{story.title}</CardTitle>
                <p className="text-xs text-gray-500">
                  {story.author && `By ${story.author} • `}
                  {story.estimatedTime}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentStep + 1} / {story.steps.length}
              </Badge>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close story"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 flex gap-1">
            {story.steps.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    idx < currentStep
                      ? "bg-indigo-600 w-full"
                      : idx === currentStep
                        ? "bg-indigo-600"
                        : "bg-transparent"
                  }`}
                  style={{
                    width: idx === currentStep ? `${progress}%` : undefined,
                  }}
                />
              </div>
            ))}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="pt-4 space-y-4">
          {/* Step title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
              {currentStep + 1}
            </div>
            <h3 className="font-semibold text-lg">{step.title}</h3>
          </div>

          {/* Narrative */}
          <p className="text-gray-700 leading-relaxed">{step.narrative}</p>

          {/* Insight callout */}
          {step.insight && (
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-green-800">Key Insight:</span>
                <p className="text-sm text-green-700 mt-0.5">{step.insight}</p>
              </div>
            </div>
          )}

          {/* Caveat/warning */}
          {step.caveat && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-amber-800">Important Note:</span>
                <p className="text-sm text-amber-700 mt-0.5">{step.caveat}</p>
              </div>
            </div>
          )}

          {/* Citation */}
          {step.citation && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Source: {step.citation.title}</span>
              {step.citation.url && (
                <a
                  href={step.citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                disabled={isFirstStep}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                onClick={togglePlay}
                className={isPlaying ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={isLastStep}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Use arrow keys to navigate, space to play/pause
              </span>
              {!isLastStep && (
                <Button variant="default" size="sm" onClick={goToNext}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {isLastStep && (
                <Button variant="default" size="sm" onClick={onClose}>
                  Finish Story
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pre-built stories
export const SAMPLE_STORIES: Story[] = [
  {
    id: "money-to-votes",
    title: "Following the Money: From Donations to Votes",
    description: "An interactive walkthrough showing how to trace campaign contributions to legislative outcomes.",
    author: "CivicLens Team",
    estimatedTime: "5 min read",
    tags: ["donations", "voting", "transparency"],
    steps: [
      {
        id: "intro",
        title: "Introduction",
        narrative:
          "Campaign finance is a fundamental part of American politics. In this story, we'll explore how to use CivicLens to trace the flow of money from donors to politicians, and examine voting patterns on related legislation.",
        duration: 6,
      },
      {
        id: "donations-overview",
        title: "The Donation Landscape",
        narrative:
          "Start by exploring the Donations Map. Each state's color intensity represents the total campaign contributions originating from that state. Notice how certain states consistently appear as major sources of political donations.",
        dataHighlight: {
          type: "map",
          config: { view: "total" },
        },
        insight: "California, New York, and Texas typically lead in total campaign contributions.",
        duration: 7,
      },
      {
        id: "category-breakdown",
        title: "Who's Giving?",
        narrative:
          "The Radial Chart breaks down donations by category. Healthcare, Finance, and Energy sectors are often the largest contributors. Click on any category to see the specific donors and their contribution amounts.",
        dataHighlight: {
          type: "radial",
          config: { showBills: true },
        },
        insight: "Industry groups often donate to politicians on committees that oversee their sector.",
        duration: 6,
      },
      {
        id: "timeline-correlation",
        title: "Timing Matters",
        narrative:
          "The Timeline view shows when donations and votes occur. You might notice donations clustering before important votes. Click on a donation to see what votes happened nearby.",
        dataHighlight: {
          type: "timeline",
          config: { showCrossReference: true },
        },
        caveat: "Correlation does not imply causation. Donations and votes may coincide for many reasons unrelated to influence.",
        duration: 8,
      },
      {
        id: "network-connections",
        title: "Mapping Influence",
        narrative:
          "The Network Graph reveals connections between donors, politicians, and legislation. Use 'Influence Path' mode to trace how money flows from a specific donor through politicians to the bills they vote on.",
        dataHighlight: {
          type: "network",
          config: { mode: "influence_path" },
        },
        insight: "Some donors give to politicians on both sides of the aisle, suggesting access rather than ideology may be the goal.",
        duration: 7,
      },
      {
        id: "conclusion",
        title: "Draw Your Own Conclusions",
        narrative:
          "CivicLens provides the data and tools to investigate political finance. We present facts and connections, but encourage you to form your own conclusions. Always check the sources (click citation badges) and remember that democracy depends on informed citizens.",
        citation: {
          title: "FEC Campaign Finance Data",
          url: "https://www.fec.gov/data/",
        },
        duration: 6,
      },
    ],
  },
  {
    id: "healthcare-spotlight",
    title: "Healthcare Industry Spotlight",
    description: "Examine how healthcare industry contributions relate to healthcare legislation.",
    author: "CivicLens Team",
    estimatedTime: "4 min read",
    tags: ["healthcare", "industry", "policy"],
    steps: [
      {
        id: "intro",
        title: "Healthcare and Politics",
        narrative:
          "Healthcare policy affects everyone. Let's explore how the healthcare industry engages with the political process through campaign contributions.",
        duration: 5,
      },
      {
        id: "industry-overview",
        title: "Healthcare Donors",
        narrative:
          "Filter the network graph to show only healthcare-related donors. You'll see pharmaceutical companies, hospital associations, and insurance industry groups among the top contributors.",
        dataHighlight: {
          type: "network",
          config: { category: "Healthcare" },
        },
        insight: "The healthcare industry consistently ranks among the top 5 sectors for political contributions.",
        duration: 6,
      },
      {
        id: "legislation",
        title: "Related Legislation",
        narrative:
          "In the Radial Chart, expand the Healthcare category to see related bills. Notice how donations connect to votes on drug pricing, insurance regulations, and Medicare policy.",
        dataHighlight: {
          type: "radial",
          config: { category: "Healthcare", showBills: true },
        },
        caveat: "Politicians may support healthcare policies for many reasons beyond donations, including constituent needs and personal beliefs.",
        duration: 7,
      },
      {
        id: "conclusion",
        title: "Your Turn to Investigate",
        narrative:
          "Use these tools to dig deeper into any policy area that interests you. Filter by category, compare politicians, and always check the sources.",
        duration: 5,
      },
    ],
  },
];

// Story selector component
interface StorySelectorProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
}

export function StorySelector({ stories, onSelectStory }: StorySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Guided Stories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onSelectStory(story)}
            className="w-full p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium group-hover:text-indigo-600">
                  {story.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">{story.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {story.estimatedTime}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {story.steps.length} steps
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
