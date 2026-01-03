import type { Statement, Citation } from "@/lib/types";
import SourceLink from "./SourceLink";
import { ViewSourcesButton } from "./SourceLink";
import InsufficientData from "./InsufficientData";

interface StatementsListProps {
  statements: Statement[];
  onCitationClick?: (citation: Citation) => void;
}

export default function StatementsList({
  statements,
  onCitationClick,
}: StatementsListProps) {
  if (statements.length === 0) {
    return (
      <InsufficientData
        title="No statements available"
        message="Public statements for this politician are not available at this time."
      />
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Collect all citations
  const allCitations = statements.flatMap(
    (statement) => statement.citations || []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="headline-md text-ink-900">Statements & Quotes</h2>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>

      <div className="grid gap-6">
        {statements.map((statement) => (
          <div
            key={statement.id}
            className="relative bg-card border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            {/* Editorial accent line */}
            <div className="absolute left-0 top-6 h-12 w-1 rounded-r bg-amber-500" />

            <div className="pl-4">
              <blockquote className="font-serif text-lg italic leading-relaxed text-ink-900">
                &quot;{statement.text}&quot;
              </blockquote>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {statement.date && (
                  <span className="font-medium text-ink-500">
                    {formatDate(statement.date)}
                  </span>
                )}
                {statement.source_type && (
                  <span className="inline-flex items-center rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    {statement.source_type}
                  </span>
                )}
              </div>

              {statement.citations && statement.citations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-50 pt-4">
                  {statement.citations.map((citation, idx) => (
                    <SourceLink
                      key={idx}
                      citation={citation}
                      onClick={onCitationClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
