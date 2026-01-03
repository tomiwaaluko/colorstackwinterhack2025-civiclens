"use client";

import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

interface IssueCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  politicianCount: number;
  voteCount: number;
  color: string;
}

// Map color prop to explicit Tailwind classes to prevent purging
const colorClasses: Record<
  string,
  { bg: string; bgOpacity: string; text: string }
> = {
  "bg-blue-500/20": {
    bg: "bg-blue-500/20",
    bgOpacity: "bg-blue-500 bg-opacity-10",
    text: "text-blue-500",
  },
  "bg-green-500/20": {
    bg: "bg-green-500/20",
    bgOpacity: "bg-green-500 bg-opacity-10",
    text: "text-green-500",
  },
  "bg-purple-500/20": {
    bg: "bg-purple-500/20",
    bgOpacity: "bg-purple-500 bg-opacity-10",
    text: "text-purple-500",
  },
  "bg-orange-500/20": {
    bg: "bg-orange-500/20",
    bgOpacity: "bg-orange-500 bg-opacity-10",
    text: "text-orange-500",
  },
  "bg-red-500/20": {
    bg: "bg-red-500/20",
    bgOpacity: "bg-red-500 bg-opacity-10",
    text: "text-red-500",
  },
  "bg-yellow-500/20": {
    bg: "bg-yellow-500/20",
    bgOpacity: "bg-yellow-500 bg-opacity-10",
    text: "text-yellow-500",
  },
  "bg-pink-500/20": {
    bg: "bg-pink-500/20",
    bgOpacity: "bg-pink-500 bg-opacity-10",
    text: "text-pink-500",
  },
  "bg-indigo-500/20": {
    bg: "bg-indigo-500/20",
    bgOpacity: "bg-indigo-500 bg-opacity-10",
    text: "text-indigo-500",
  },
};

export function IssueCard({
  id,
  title,
  description,
  icon: Icon,
  politicianCount,
  voteCount,
  color,
}: IssueCardProps) {
  // Get the mapped color classes or fallback to blue
  const classes = colorClasses[color] || colorClasses["bg-blue-500/20"];
  return (
    <Link
      href={`/issues/${id}`}
      className="bg-card border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group block p-6 relative overflow-hidden"
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${classes.bg}`}
      />

      <div className="relative">
        <div className={`inline-flex p-3 rounded-xl mb-4 ${classes.bgOpacity}`}>
          <Icon className={`h-6 w-6 ${classes.text}`} />
        </div>

        <h3 className="font-serif text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-lg font-semibold text-foreground">
                {politicianCount}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                Politicians
              </span>
            </div>
            <div>
              <span className="text-lg font-semibold text-foreground">
                {voteCount}
              </span>
              <span className="text-xs text-muted-foreground ml-1">Votes</span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
