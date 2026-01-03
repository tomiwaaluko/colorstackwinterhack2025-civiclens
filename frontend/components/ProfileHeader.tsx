import type { Politician } from "@/lib/types";

interface ProfileHeaderProps {
  politician: Politician;
}

export default function ProfileHeader({ politician }: ProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Decorative accent bar */}
      <div className="absolute top-0 left-0 w-20 h-1 bg-[var(--amber-400)]" />

      <div className="pt-6 flex flex-col md:flex-row gap-8 items-start">
        {/* Photo with gradient border */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--amber-200)] to-[var(--ink-200)] rounded-full blur-sm transform translate-y-1" />
          {politician.photo_url ? (
            <img
              src={politician.photo_url}
              alt={politician.name}
              className="relative h-32 w-32 rounded-full object-cover border-4 border-white shadow-sm"
            />
          ) : (
            <div className="relative h-32 w-32 rounded-full bg-[var(--ink-100)] border-4 border-white shadow-sm flex items-center justify-center text-4xl">
              👤
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="headline-lg text-[var(--ink-900)] mb-2">
              {politician.name}
            </h1>

            <div className="flex flex-wrap gap-3">
              {politician.party && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--ink-100)] text-[var(--ink-700)] border border-[var(--ink-200)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--ink-500)] mr-2" />
                  {politician.party}
                </span>
              )}

              {politician.office && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--surface)] text-[var(--ink-700)] border border-[var(--ink-200)] shadow-sm">
                  🏛️ {politician.office}
                  {politician.state && `, ${politician.state}`}
                  {politician.district && ` - District ${politician.district}`}
                </span>
              )}
            </div>
          </div>

          {politician.bio && (
            <div className="prose prose-sm max-w-none text-[var(--ink-600)] font-serif leading-relaxed border-l-2 border-[var(--amber-200)] pl-4">
              {politician.bio}
            </div>
          )}

          {/* Responsible AI Notice */}
          <div className="flex items-center gap-2 text-xs text-[var(--ink-400)] pt-2">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              AI-generated summary based on public records. Verify with
              citations.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
