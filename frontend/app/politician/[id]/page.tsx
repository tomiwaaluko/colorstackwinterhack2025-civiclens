"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPoliticianSummary } from "@/lib/api";
import type {
  ApiError,
  PoliticianSummaryResponse,
  Politician,
} from "@/lib/types";
import ProfileHeader from "@/components/ProfileHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import InsufficientData from "@/components/InsufficientData";

export default function PoliticianProfilePage() {
  const params = useParams();

  // Validate params.id is a string (not array or undefined)
  const rawId = params.id;
  const id =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null;

  const [profile, setProfile] = useState<PoliticianSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [politician, setPolitician] = useState<Politician | null>(null);

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
        const data = await getPoliticianSummary(id);
        setProfile(data);
        setPolitician({
          id: data.id,
          name: data.name,
          party: data.party,
          office: data.position,
          state: data.state_or_district,
          photo_url: data.image_url,
        });
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

  const votes = profile.politician_details?.votes ?? [];
  const statements = profile.politician_details?.statements ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header Section */}
        {politician && <ProfileHeader politician={politician} />}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Votes Recorded</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {profile.vote_count ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Statements Logged</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {profile.statement_count ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Position</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {profile.position || "Unknown"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">State/District</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {profile.state_or_district || "N/A"}
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="headline-md text-foreground">Recent Votes</h2>
            {votes.length === 0 ? (
              <InsufficientData
                title="No voting records available"
                message="Voting records for this politician are not available at this time."
              />
            ) : (
              <div className="grid gap-4">
                {votes.map((vote, index) => {
                  const billTitle = vote[0] || "Unknown Bill";
                  const voteValue = vote[1] || "Unknown";
                  return (
                    <div
                      key={`${billTitle}-${index}`}
                      className="bg-card border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                          Vote
                        </p>
                        <h3 className="font-serif text-lg text-foreground">
                          {billTitle}
                        </h3>
                        <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                          {voteValue}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="headline-md text-foreground">Statements</h2>
            {statements.length === 0 ? (
              <InsufficientData
                title="No statements available"
                message="Public statements for this politician are not available at this time."
              />
            ) : (
              <div className="grid gap-4">
                {statements.map((statement, index) => (
                  <div
                    key={`${index}-${statement.slice(0, 12)}`}
                    className="relative bg-card border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="absolute left-0 top-6 h-12 w-1 rounded-r bg-amber-500" />
                    <blockquote className="pl-4 font-serif text-lg italic text-foreground">
                      &quot;{statement}&quot;
                    </blockquote>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
