import type { Vote, Citation } from '@/lib/types';
import SourceLink from './SourceLink';
import { ViewSourcesButton } from './SourceLink';
import InsufficientData from './InsufficientData';

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

  const getVoteColor = (position: Vote['vote_position']) => {
    switch (position) {
      case 'yes':
        return 'bg-green-100 text-green-800';
      case 'no':
        return 'bg-red-100 text-red-800';
      case 'abstain':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Collect all citations from votes
  const allCitations = votes.flatMap((vote) => vote.citations || []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Key Votes</h2>
        {allCitations.length > 0 && (
          <ViewSourcesButton
            citations={allCitations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
      <div className="space-y-4">
        {votes.map((vote) => (
          <div
            key={vote.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getVoteColor(
                      vote.vote_position
                    )}`}
                  >
                    {vote.vote_position.toUpperCase()}
                  </span>
                  {vote.vote_date && (
                    <span className="text-sm text-gray-500">
                      {formatDate(vote.vote_date)}
                    </span>
                  )}
                </div>
                {vote.bill_title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {vote.bill_title}
                  </h3>
                )}
                {vote.topic && (
                  <p className="text-sm text-gray-600 mb-2">Topic: {vote.topic}</p>
                )}
                {vote.citations && vote.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vote.citations.map((citation, idx) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}

