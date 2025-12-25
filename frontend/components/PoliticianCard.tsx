import Link from 'next/link';
import type { Politician } from '@/lib/types';

interface PoliticianCardProps {
  politician: Politician;
}

export default function PoliticianCard({ politician }: PoliticianCardProps) {
  return (
    <Link
      href={`/politician/${politician.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {politician.name}
          </h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {politician.office && (
              <p>
                <span className="font-medium">Office:</span> {politician.office}
                {politician.state && `, ${politician.state}`}
                {politician.district && ` - District ${politician.district}`}
              </p>
            )}
            {politician.party && (
              <p>
                <span className="font-medium">Party:</span> {politician.party}
              </p>
            )}
          </div>
        </div>
        <div className="ml-4">
          <svg
            className="h-5 w-5 text-gray-400"
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
    </Link>
  );
}

