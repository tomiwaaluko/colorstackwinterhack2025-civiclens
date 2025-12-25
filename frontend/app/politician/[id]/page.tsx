'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPoliticianProfile } from '@/lib/api';
import type { PoliticianProfile, ApiError, Citation } from '@/lib/types';
import ProfileHeader from '@/components/ProfileHeader';
import KeyVotes from '@/components/KeyVotes';
import DonorChart from '@/components/DonorChart';
import StatementsList from '@/components/StatementsList';
import LoadingSpinner from '@/components/LoadingSpinner';
import InsufficientData from '@/components/InsufficientData';
import SourceDrawer from '@/components/SourceDrawer';

export default function PoliticianProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<PoliticianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCitation(null);
  };

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPoliticianProfile(id);
        setProfile(data);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to load politician profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadProfile();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InsufficientData
          title="Profile not found"
          message="The requested politician profile could not be found."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-8 shadow">
        <ProfileHeader politician={profile.politician} />

        <div className="mt-8 space-y-12">
          <section>
            <KeyVotes
              votes={profile.votes || []}
              onCitationClick={handleCitationClick}
            />
          </section>

          <section>
            <DonorChart
              donations={profile.donations || []}
              onCitationClick={handleCitationClick}
            />
          </section>

          <section>
            <StatementsList
              statements={profile.statements || []}
              onCitationClick={handleCitationClick}
            />
          </section>
        </div>

        {profile.source_count !== undefined && profile.source_count > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              This profile is based on {profile.source_count} source
              {profile.source_count !== 1 ? 's' : ''} of public information.
            </p>
          </div>
        )}
      </div>

      <SourceDrawer
        citation={selectedCitation}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
