import type { Vote, Citation } from "@/lib/types";
import SourceLink from "./SourceLink";
import { ViewSourcesButton } from "./SourceLink";
import InsufficientData from "./InsufficientData";

interface KeyVotesProps {
  votes: Vote[];
  onCitationClick?: (citation: Citation) => void;
}

export default function KeyVotes({ votes, onCitationClick }: KeyVotesProps) {
  if (votes.length === 0) {
    return (
      <InsufficientData
        title="No voting records available"
        message="Voting records for this politician are not available at this time."
      />
    );
  }

  const getVoteColor = (position: Vote["vote_position"]) => {
    switch (position.toLowerCase()) {
      case "yes":
      case "yea":
      case "aye":
        return "bg-green-50 text-green-700 border-green-200";
      case "no":
      case "nay":
        return "bg-red-50 text-red-700 border-red-200";
      case "abstain":
      case "present":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-[var(--ink-50)] text-[var(--ink-600)] border-[var(--ink-200)]";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Collect all citations from votes
  const allCitations = votes.flatMap((vote) => vote.citations || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--ink-100)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--ink-50)] flex items-center justify-center text-xl">
            🗳️
          </div>
          <h2 className="headline-md text-[var(--ink-900)]">Key Votes</h2>
        </div>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>

      <div className="space-y-4">
        {votes.map((vote, index) => (
          <div
            key={index}
            className="group relative bg-white border border-[var(--ink-200)] rounded-lg p-5 transition-all hover:shadow-md hover:border-[var(--ink-300)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getVoteColor(
                      vote.vote_position
                    )}`}
                  >
                    {vote.vote_position}
                  </span>
                  <span className="text-sm text-[var(--ink-500)] flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {formatDate(vote.vote_date)}
                  </span>
                </div>

                <h3 className="text-lg font-serif font-medium text-[var(--ink-900)] leading-snug mb-2">
                  {vote.bill_title}
                </h3>

                <p className="text-sm text-[var(--ink-600)] line-clamp-2">
                  {vote.topic}
                </p>
              </div>

              {vote.citations && vote.citations.length > 0 && (
                <div className="flex-shrink-0 pt-1">
                  <SourceLink
                    citation={vote.citations[0]}
                    onClick={onCitationClick}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
