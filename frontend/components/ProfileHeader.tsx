import type { Politician } from '@/lib/types';

interface ProfileHeaderProps {
  politician: Politician;
}

export default function ProfileHeader({ politician }: ProfileHeaderProps) {
  return (
    <div className="border-b border-gray-200 pb-6">
      <div className="flex items-start gap-6">
        {politician.photo_url && (
          <img
            src={politician.photo_url}
            alt={politician.name}
            className="h-24 w-24 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{politician.name}</h1>
          <div className="mt-2 space-y-1 text-gray-600">
            {politician.office && (
              <p className="text-lg">
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
          {politician.bio && (
            <p className="mt-4 text-gray-700">{politician.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

