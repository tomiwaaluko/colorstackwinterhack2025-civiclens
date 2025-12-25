import Link from "next/link";
import type { Politician } from "@/lib/types";

interface PoliticianCardProps {
  politician: Politician;
}

export default function PoliticianCard({ politician }: PoliticianCardProps) {
  return (
    <Link
      href={`/politician/${politician.id}`}
      className="group relative block h-full bg-white border border-ink-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-amber-300"
    >
      {/* Accent Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-ink-100 group-hover:bg-amber-400 transition-colors duration-300" />

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center text-2xl border border-ink-200">
            👤
          </div>
          <div className="w-8 h-8 rounded-full bg-ink-50 flex items-center justify-center text-ink-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        <h3 className="headline-sm text-ink-900 mb-2 group-hover:text-amber-600 transition-colors">
          {politician.name}
        </h3>

        <div className="space-y-2 text-sm text-ink-600">
          {politician.party && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ink-400" />
              <span className="font-medium">{politician.party}</span>
            </div>
          )}

          {politician.office && (
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 mt-0.5 text-ink-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>
                {politician.office}
                {politician.state && `, ${politician.state}`}
                {politician.district && ` - District ${politician.district}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-3 bg-ink-50 border-t border-ink-100 flex items-center justify-between text-xs font-medium text-ink-500 group-hover:text-ink-700 transition-colors">
        <span>View voting records</span>
        <span>→</span>
      </div>
    </Link>
  );
}
