"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VotingChart } from "@/components/VotingChart";
import { DonorBreakdownNew } from "@/components/DonorBreakdownNew";
import { CitationBadge } from "@/components/CitationBadge";
import {
  Search,
  Users,
  ArrowLeftRight,
  Quote,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockPoliticianA = {
  id: "1",
  name: "Elizabeth Warren",
  party: "Democrat",
  state: "Massachusetts",
  position: "U.S. Senator",
  votingData: [
    { category: "Healthcare", yes: 45, no: 12, abstain: 3 },
    { category: "Economy", yes: 38, no: 24, abstain: 2 },
    { category: "Environment", yes: 52, no: 8, abstain: 1 },
    { category: "Education", yes: 41, no: 15, abstain: 4 },
  ],
  donorData: [
    { name: "Education", value: 450000, color: "hsl(var(--chart-1))" },
    { name: "Healthcare", value: 320000, color: "hsl(var(--chart-2))" },
    { name: "Technology", value: 280000, color: "hsl(var(--chart-3))" },
    { name: "Finance", value: 150000, color: "hsl(var(--chart-4))" },
  ],
  totalDonations: "$1.2M",
  statements: [
    {
      text: "We need bold action on healthcare. Every American deserves access to affordable care.",
      date: "March 15, 2024",
      source: "Senate Floor Speech",
    },
    {
      text: "Climate change is the existential threat of our time. We must act now.",
      date: "February 28, 2024",
      source: "Press Conference",
    },
  ],
};

const mockPoliticianB = {
  id: "2",
  name: "Marco Rubio",
  party: "Republican",
  state: "Florida",
  position: "U.S. Senator",
  votingData: [
    { category: "Healthcare", yes: 18, no: 42, abstain: 2 },
    { category: "Economy", yes: 48, no: 14, abstain: 1 },
    { category: "Environment", yes: 15, no: 38, abstain: 8 },
    { category: "Education", yes: 32, no: 21, abstain: 7 },
  ],
  donorData: [
    { name: "Finance", value: 520000, color: "hsl(var(--chart-1))" },
    { name: "Real Estate", value: 380000, color: "hsl(var(--chart-2))" },
    { name: "Defense", value: 290000, color: "hsl(var(--chart-3))" },
    { name: "Energy", value: 210000, color: "hsl(var(--chart-4))" },
  ],
  totalDonations: "$1.4M",
  statements: [
    {
      text: "Economic growth comes from the private sector, not government mandates.",
      date: "March 10, 2024",
      source: "Fox News Interview",
    },
    {
      text: "We must secure our borders while maintaining legal pathways to immigration.",
      date: "February 20, 2024",
      source: "Town Hall",
    },
  ],
};

function ComparePageContent() {
  const searchParams = useSearchParams();
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [politicianA] = useState(mockPoliticianA);
  const [politicianB] = useState(mockPoliticianB);

  const citation = {
    id: "1",
    source: "OpenSecrets.org",
    url: "https://www.opensecrets.org",
    date: "January 2024",
    type: "donation" as const,
  };

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-sm font-medium text-accent-foreground mb-6">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Side-by-Side Comparison</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Compare Politicians
            </h1>
            <p className="text-muted-foreground">
              View voting records, donor data, and public statements side by
              side. All data is verified and cited from official sources.
            </p>
          </div>
        </div>
      </section>

      {/* Selection */}
      <section className="py-8 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Politician A */}
            <div className="civic-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search first politician..."
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {politicianA.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      {politicianA.party}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {politicianA.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-4 w-4" />
                    <span>{politicianA.position}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Politician B */}
            <div className="civic-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search second politician..."
                    value={searchB}
                    onChange={(e) => setSearchB(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {politicianB.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-800"
                    >
                      {politicianB.party}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {politicianB.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-4 w-4" />
                    <span>{politicianB.position}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Data */}
      <section className="py-12">
        <div className="container">
          {/* Voting Records */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Voting Records
              <CitationBadge citation={citation} index={1} />
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <VotingChart data={politicianA.votingData} />
              <VotingChart data={politicianB.votingData} />
            </div>
          </div>

          {/* Donor Breakdown */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Donor Breakdown
              <CitationBadge citation={citation} index={2} />
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DonorBreakdownNew
                data={politicianA.donorData}
                totalDonations={politicianA.totalDonations}
              />
              <DonorBreakdownNew
                data={politicianB.donorData}
                totalDonations={politicianB.totalDonations}
              />
            </div>
          </div>

          {/* Public Statements */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
              Recent Public Statements
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Politician A Statements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {politicianA.name}
                </h3>
                {politicianA.statements.map((statement, index) => (
                  <div key={index} className="civic-card p-6">
                    <Quote className="h-6 w-6 text-accent mb-3" />
                    <p className="text-foreground mb-4 leading-relaxed">
                      &quot;{statement.text}&quot;
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{statement.date}</span>
                      <span className="flex items-center gap-1">
                        {statement.source}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Politician B Statements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {politicianB.name}
                </h3>
                {politicianB.statements.map((statement, index) => (
                  <div key={index} className="civic-card p-6">
                    <Quote className="h-6 w-6 text-accent mb-3" />
                    <p className="text-foreground mb-4 leading-relaxed">
                      &quot;{statement.text}&quot;
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{statement.date}</span>
                      <span className="flex items-center gap-1">
                        {statement.source}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
