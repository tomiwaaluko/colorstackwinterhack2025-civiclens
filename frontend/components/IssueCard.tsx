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

export function IssueCard({
  id,
  title,
  description,
  icon: Icon,
  politicianCount,
  voteCount,
  color,
}: IssueCardProps) {
  return (
    <Link
      href={`/issues/${id}`}
      className="bg-card border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group block p-6 relative overflow-hidden"
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${color}`}
      />

      <div className="relative">
        <div
          className={`inline-flex p-3 rounded-xl mb-4 ${color} bg-opacity-10`}
        >
          <Icon
            className={`h-6 w-6 ${color
              .replace("bg-", "text-")
              .replace("/20", "")}`}
          />
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
