"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface TimeSliderProps {
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  playSpeed?: number; // milliseconds between year changes
  className?: string;
}

export default function TimeSlider({
  years,
  selectedYear,
  onYearChange,
  isPlaying = false,
  onPlayingChange,
  playSpeed = 1500,
  className = "",
}: TimeSliderProps) {
  const [internalPlaying, setInternalPlaying] = useState(isPlaying);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playing = onPlayingChange ? isPlaying : internalPlaying;
  const setPlaying = onPlayingChange || setInternalPlaying;

  const sortedYears = [...years].sort((a, b) => a - b);
  const currentIndex = sortedYears.indexOf(selectedYear);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % sortedYears.length;
    onYearChange(sortedYears[nextIndex]);
  }, [currentIndex, sortedYears, onYearChange]);

  const goToPrev = useCallback(() => {
    const prevIndex = currentIndex <= 0 ? sortedYears.length - 1 : currentIndex - 1;
    onYearChange(sortedYears[prevIndex]);
  }, [currentIndex, sortedYears, onYearChange]);

  const togglePlay = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  // Auto-play effect
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(goToNext, playSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playing, goToNext, playSpeed]);

  // Calculate slider position
  const sliderPosition = sortedYears.length > 1
    ? (currentIndex / (sortedYears.length - 1)) * 100
    : 50;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={sortedYears.length <= 1}
          aria-label="Previous year"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant={playing ? "default" : "outline"}
          size="sm"
          onClick={togglePlay}
          disabled={sortedYears.length <= 1}
          aria-label={playing ? "Pause" : "Play"}
          className="min-w-[80px]"
        >
          {playing ? (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Play
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={sortedYears.length <= 1}
          aria-label="Next year"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Year indicator */}
      <div className="text-center">
        <span className="text-2xl font-bold text-blue-600">{selectedYear}</span>
        <span className="text-gray-500 text-sm ml-2">
          ({currentIndex + 1} of {sortedYears.length})
        </span>
      </div>

      {/* Timeline slider */}
      <div className="relative px-4">
        {/* Track */}
        <div className="h-2 bg-gray-200 rounded-full relative">
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${sliderPosition}%` }}
          />
          {/* Year markers */}
          {sortedYears.map((year, index) => {
            const position = sortedYears.length > 1
              ? (index / (sortedYears.length - 1)) * 100
              : 50;
            const isSelected = year === selectedYear;
            return (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 scale-125 z-10"
                    : "bg-white border-gray-400 hover:border-blue-400 hover:scale-110"
                }`}
                style={{ left: `${position}%` }}
                aria-label={`Select year ${year}`}
                title={String(year)}
              />
            );
          })}
        </div>

        {/* Year labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {sortedYears.length <= 6 ? (
            sortedYears.map((year) => (
              <span
                key={year}
                className={year === selectedYear ? "font-bold text-blue-600" : ""}
              >
                {year}
              </span>
            ))
          ) : (
            <>
              <span className={sortedYears[0] === selectedYear ? "font-bold text-blue-600" : ""}>
                {sortedYears[0]}
              </span>
              <span className="text-gray-400">•••</span>
              <span className={sortedYears[sortedYears.length - 1] === selectedYear ? "font-bold text-blue-600" : ""}>
                {sortedYears[sortedYears.length - 1]}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
