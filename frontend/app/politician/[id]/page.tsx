"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPoliticianProfile } from "@/lib/api";
import type { PoliticianProfile, ApiError, Citation } from "@/lib/types";
import ProfileHeader from "@/components/ProfileHeader";
import KeyVotes from "@/components/KeyVotes";
import DonorChart from "@/components/DonorChart";
import StatementsList from "@/components/StatementsList";
import LoadingSpinner from "@/components/LoadingSpinner";
import InsufficientData from "@/components/InsufficientData";
import SourceDrawer from "@/components/SourceDrawer";
import AskPanel from "@/components/AskPanel";

export default function PoliticianProfilePage() {
  const params = useParams();

  // Validate params.id is a string (not array or undefined)
  const rawId = params.id;
  const id =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null;

  const [profile, setProfile] = useState<PoliticianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null
  );
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
      // Guard: only proceed if id is a valid string
      if (!id || typeof id !== "string") {
        setError("Invalid politician ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getPoliticianProfile(id);
        setProfile(data);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || "Failed to load politician profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="headline-sm text-red-900 mb-2">
            Error Loading Profile
          </h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <InsufficientData
          title="Profile not found"
          message="The requested politician profile could not be found."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header Section */}
        <ProfileHeader politician={profile.politician} />

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Key Info */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <KeyVotes
                votes={profile.votes || []}
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

          {/* Right Column: Donors & AI */}
          <div className="space-y-8">
            <section>
              <DonorChart
                donations={profile.donations || []}
                onCitationClick={handleCitationClick}
              />
            </section>

            <section className="rounded-xl bg-ink-50 p-6">
              <h3 className="headline-sm mb-4 text-ink-900">
                Ask About {profile.politician.name}
              </h3>
              {id && <AskPanel politicianIds={[id]} />}
            </section>
          </div>
        </div>

        {profile.source_count !== undefined && profile.source_count > 0 && (
          <div className="mt-12 border-t border-ink-100 pt-6 text-center">
            <p className="text-sm text-ink-500">
              This profile is based on {profile.source_count} source
              {profile.source_count !== 1 ? "s" : ""} of public information.
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
