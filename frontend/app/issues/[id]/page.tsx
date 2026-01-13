"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Heart, Leaf, Briefcase, UserCheck, ArrowLeft, TrendingUp, Users, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const issueData: Record<string, {
  title: string;
  icon: any;
  color: string;
  description: string;
  overview: string;
  keyLegislation: Array<{
    bill: string;
    title: string;
    status: string;
    votes: { yea: number; nay: number };
  }>;
  topPoliticians: Array<{
    name: string;
    party: string;
    state: string;
    stance: string;
    voteRecord: string;
  }>;
  recentActivity: Array<{
    date: string;
    type: string;
    description: string;
  }>;
  stats: {
    totalBills: number;
    activeDebates: number;
    recentVotes: number;
  };
}> = {
  healthcare: {
    title: "Healthcare",
    icon: Heart,
    color: "text-red-500",
    description: "Medical coverage, prescription drug costs, and healthcare reform legislation",
    overview: "Healthcare remains one of the most debated policy areas in Congress. Key issues include expanding access to affordable care, reducing prescription drug costs, protecting coverage for pre-existing conditions, and addressing rural healthcare access. Recent legislation has focused on extending Affordable Care Act subsidies and negotiating Medicare drug prices.",
    keyLegislation: [
      {
        bill: "H.R. 1834",
        title: "Affordable Care Act Subsidy Extension",
        status: "Passed House",
        votes: { yea: 230, nay: 196 }
      },
      {
        bill: "S. 541",
        title: "Medicare Drug Price Negotiation Act",
        status: "In Committee",
        votes: { yea: 0, nay: 0 }
      },
      {
        bill: "H.R. 2023",
        title: "Rural Healthcare Access Improvement",
        status: "Passed Both Chambers",
        votes: { yea: 412, nay: 23 }
      }
    ],
    topPoliticians: [
      { name: "Elizabeth Warren", party: "D", state: "MA", stance: "Strong Support", voteRecord: "94% Yes on healthcare expansion" },
      { name: "Bernie Sanders", party: "I", state: "VT", stance: "Strong Support", voteRecord: "98% Yes on healthcare expansion" },
      { name: "Marco Rubio", party: "R", state: "FL", stance: "Reform Focused", voteRecord: "Mixed record on healthcare bills" }
    ],
    recentActivity: [
      { date: "Jan 2026", type: "Vote", description: "H.R. 1834 passed House with bipartisan support (230-196)" },
      { date: "Dec 2025", type: "Hearing", description: "Senate HELP Committee held hearing on prescription drug costs" },
      { date: "Nov 2025", type: "Statement", description: "67 senators signed letter supporting Medicare negotiations" }
    ],
    stats: {
      totalBills: 142,
      activeDebates: 8,
      recentVotes: 23
    }
  },
  climate: {
    title: "Climate & Environment",
    icon: Leaf,
    color: "text-green-500",
    description: "Environmental protection, clean energy initiatives, and climate policy",
    overview: "Climate and environmental policy encompasses efforts to reduce carbon emissions, transition to clean energy, protect natural resources, and address climate change impacts. Recent focus includes renewable energy incentives, emissions standards, conservation funding, and climate resilience infrastructure.",
    keyLegislation: [
      {
        bill: "H.R. 3401",
        title: "Clean Energy Investment Act",
        status: "Passed House",
        votes: { yea: 225, nay: 210 }
      },
      {
        bill: "S. 892",
        title: "National Parks Protection and Funding",
        status: "Passed Both Chambers",
        votes: { yea: 389, nay: 46 }
      },
      {
        bill: "H.R. 4102",
        title: "Renewable Energy Tax Credits Extension",
        status: "In Committee",
        votes: { yea: 0, nay: 0 }
      }
    ],
    topPoliticians: [
      { name: "Ed Markey", party: "D", state: "MA", stance: "Strong Advocate", voteRecord: "100% Yes on climate bills" },
      { name: "Brian Schatz", party: "D", state: "HI", stance: "Strong Advocate", voteRecord: "96% Yes on climate bills" },
      { name: "Lisa Murkowski", party: "R", state: "AK", stance: "Balanced Approach", voteRecord: "Supports energy diversification" }
    ],
    recentActivity: [
      { date: "Jan 2026", type: "Vote", description: "Clean Energy Investment Act passed House (225-210)" },
      { date: "Dec 2025", type: "Bill Introduced", description: "Bipartisan coastal resilience bill introduced in Senate" },
      { date: "Nov 2025", type: "Statement", description: "23 governors urged Congress to extend renewable tax credits" }
    ],
    stats: {
      totalBills: 89,
      activeDebates: 12,
      recentVotes: 18
    }
  },
  economy: {
    title: "Economy & Jobs",
    icon: Briefcase,
    color: "text-blue-500",
    description: "Economic policy, job creation, and workforce development legislation",
    overview: "Economic policy focuses on job creation, workforce development, tax policy, small business support, and infrastructure investment. Recent priorities include workforce training programs, manufacturing incentives, economic development in underserved communities, and pandemic recovery support.",
    keyLegislation: [
      {
        bill: "H.R. 2890",
        title: "Workforce Development and Training Act",
        status: "Passed Both Chambers",
        votes: { yea: 398, nay: 37 }
      },
      {
        bill: "S. 1205",
        title: "Small Business Tax Relief Extension",
        status: "Passed Senate",
        votes: { yea: 78, nay: 22 }
      },
      {
        bill: "H.R. 5012",
        title: "Manufacturing Reshoring Incentives",
        status: "In Committee",
        votes: { yea: 0, nay: 0 }
      }
    ],
    topPoliticians: [
      { name: "Sherrod Brown", party: "D", state: "OH", stance: "Worker-Focused", voteRecord: "Strong support for labor rights" },
      { name: "Tim Scott", party: "R", state: "SC", stance: "Business-Focused", voteRecord: "Advocates for tax relief and deregulation" },
      { name: "Amy Klobuchar", party: "D", state: "MN", stance: "Bipartisan Approach", voteRecord: "Supports small business growth" }
    ],
    recentActivity: [
      { date: "Jan 2026", type: "Vote", description: "Workforce Development Act signed into law" },
      { date: "Dec 2025", type: "Hearing", description: "Senate Finance Committee examined manufacturing competitiveness" },
      { date: "Nov 2025", type: "Statement", description: "Bipartisan letter supporting infrastructure jobs funding" }
    ],
    stats: {
      totalBills: 203,
      activeDebates: 15,
      recentVotes: 34
    }
  },
  immigration: {
    title: "Immigration",
    icon: UserCheck,
    color: "text-blue-500",
    description: "Border security, visa programs, and immigration reform policies",
    overview: "Immigration policy encompasses border security, pathway to citizenship, visa reforms, asylum procedures, and workforce immigration. Recent debates focus on DACA protections, border enforcement funding, visa backlog reduction, and agricultural worker programs.",
    keyLegislation: [
      {
        bill: "H.R. 3801",
        title: "DACA Protection and Pathway Act",
        status: "Passed House",
        votes: { yea: 228, nay: 207 }
      },
      {
        bill: "S. 1502",
        title: "Agricultural Worker Visa Reform",
        status: "In Committee",
        votes: { yea: 0, nay: 0 }
      },
      {
        bill: "H.R. 4205",
        title: "Border Security Infrastructure Funding",
        status: "Passed House",
        votes: { yea: 268, nay: 167 }
      }
    ],
    topPoliticians: [
      { name: "Dick Durbin", party: "D", state: "IL", stance: "Pathway Advocate", voteRecord: "Supports DACA and comprehensive reform" },
      { name: "John Cornyn", party: "R", state: "TX", stance: "Security First", voteRecord: "Prioritizes border enforcement" },
      { name: "Catherine Cortez Masto", party: "D", state: "NV", stance: "Balanced Reform", voteRecord: "Supports both security and pathway bills" }
    ],
    recentActivity: [
      { date: "Jan 2026", type: "Vote", description: "DACA Protection Act passed House (228-207)" },
      { date: "Dec 2025", type: "Hearing", description: "Judiciary Committee held asylum process reform hearing" },
      { date: "Nov 2025", type: "Statement", description: "Bipartisan farm groups urged ag worker visa reform" }
    ],
    stats: {
      totalBills: 97,
      activeDebates: 11,
      recentVotes: 19
    }
  }
};

export default function IssuePage() {
  const params = useParams();
  const issueId = params.id as string;
  const issue = issueData[issueId];

  if (!issue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Issue Not Found</h1>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = issue.icon;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-7xl">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-xl bg-muted">
              <Icon className={`h-8 w-8 ${issue.color}`} />
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold text-foreground">{issue.title}</h1>
              <p className="text-muted-foreground mt-1">{issue.description}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-2xl font-bold text-foreground">{issue.stats.totalBills}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Debates</p>
                  <p className="text-2xl font-bold text-foreground">{issue.stats.activeDebates}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Votes</p>
                  <p className="text-2xl font-bold text-foreground">{issue.stats.recentVotes}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
          </div>
        </div>

        {/* Overview */}
        <Card className="p-6 mb-8">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Overview</h2>
          <p className="text-muted-foreground leading-relaxed">{issue.overview}</p>
        </Card>

        {/* Key Legislation */}
        <Card className="p-6 mb-8">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Key Legislation</h2>
          <div className="space-y-4">
            {issue.keyLegislation.map((bill) => (
              <div key={bill.bill} className="border-l-4 border-accent pl-4 py-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{bill.bill}</h3>
                    <p className="text-muted-foreground">{bill.title}</p>
                  </div>
                  <Badge variant="outline">{bill.status}</Badge>
                </div>
                {bill.votes.yea > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Votes: {bill.votes.yea} Yea, {bill.votes.nay} Nay
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Top Politicians */}
        <Card className="p-6 mb-8">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Key Politicians</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issue.topPoliticians.map((politician) => (
              <div key={politician.name} className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground">{politician.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {politician.party} - {politician.state}
                </p>
                <Badge className="mb-2">{politician.stance}</Badge>
                <p className="text-xs text-muted-foreground">{politician.voteRecord}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {issue.recentActivity.map((activity, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-20 text-sm text-muted-foreground">{activity.date}</div>
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-1">{activity.type}</Badge>
                  <p className="text-foreground">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ask AI CTA */}
        <Card className="p-6 mt-8 bg-accent text-accent-foreground">
          <div className="text-center">
            <h3 className="font-serif text-2xl font-bold mb-2">Have Questions About {issue.title}?</h3>
            <p className="text-accent-foreground/80 mb-4">
              Ask CivicLens AI about specific bills, voting records, or politician stances on this issue.
            </p>
            <Button asChild variant="secondary" size="lg">
              <Link href="/ask">
                Ask CivicLens AI
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
