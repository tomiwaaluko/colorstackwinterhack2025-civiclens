import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VotingChart } from "@/components/VotingChart";
import { DonorBreakdown } from "@/components/DonorBreakdown";
import { CitationBadge } from "@/components/CitationBadge";
import { StatCard } from "@/components/StatCard";
import {
  Users,
  Building2,
  MapPin,
  Calendar,
  CheckCircle,
  FileText,
  DollarSign,
  Quote,
  ExternalLink,
  Download,
  Share2,
  AlertTriangle,
  Vote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockPolitician = {
  id: "1",
  name: "Elizabeth Warren",
  party: "Democrat",
  state: "Massachusetts",
  position: "U.S. Senator",
  since: "2013",
  nextElection: "2024",
  dataIntegrity: 94,
  stats: {
    votes: 2847,
    statements: 1876,
    donors: 12543,
  },
  votingData: [
    { category: "Healthcare", yes: 45, no: 12, abstain: 3 },
    { category: "Economy", yes: 38, no: 24, abstain: 2 },
    { category: "Environment", yes: 52, no: 8, abstain: 1 },
    { category: "Education", yes: 41, no: 15, abstain: 4 },
    { category: "Defense", yes: 28, no: 32, abstain: 5 },
  ],
  donorData: [
    { name: "Education", value: 450000, color: "hsl(var(--chart-1))" },
    { name: "Healthcare", value: 320000, color: "hsl(var(--chart-2))" },
    { name: "Technology", value: 280000, color: "hsl(var(--chart-3))" },
    { name: "Finance", value: 150000, color: "hsl(var(--chart-4))" },
    { name: "Other", value: 100000, color: "hsl(var(--chart-5))" },
  ],
  totalDonations: "$1.3M",
  statements: [
    {
      id: "1",
      text: "We need bold action on healthcare. Every American deserves access to affordable care without going bankrupt.",
      date: "March 15, 2024",
      source: "Senate Floor Speech",
      url: "https://congress.gov",
    },
    {
      id: "2",
      text: "Climate change is the existential threat of our time. We must act now with urgency and purpose.",
      date: "February 28, 2024",
      source: "Press Conference",
      url: "https://warren.senate.gov",
    },
    {
      id: "3",
      text: "Wall Street accountability isn't about punishment—it's about protecting working families from predatory practices.",
      date: "January 20, 2024",
      source: "CNBC Interview",
      url: "https://cnbc.com",
    },
  ],
  dataGaps: [
    "Early voting records (pre-2013) not available through automated systems",
    "Some committee hearing statements not yet transcribed",
  ],
};

export default function Politician() {
  const { id } = useParams();

  const citation = {
    id: "1",
    source: "Congress.gov",
    url: "https://www.congress.gov",
    date: "2024-01-15",
    type: "vote" as const,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Profile Header */}
        <section className="py-8 bg-card border-b border-border">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-accent rounded-full">
                    <CheckCircle className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                      {mockPolitician.name}
                    </h1>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {mockPolitician.party}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      <span>{mockPolitician.position}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{mockPolitician.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Since {mockPolitician.since}</span>
                    </div>
                  </div>

                  {/* Data Integrity Badge */}
                  <div className="flex items-center gap-3">
                    <div className="verified-badge">
                      <CheckCircle className="h-4 w-4" />
                      <span>Data Integrity: {mockPolitician.dataIntegrity}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {mockPolitician.dataGaps.length} known data gaps
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="md:ml-auto flex items-start gap-3">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="py-6 bg-muted/30">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Vote}
                value={mockPolitician.stats.votes.toLocaleString()}
                label="Verified Votes"
              />
              <StatCard
                icon={FileText}
                value={mockPolitician.stats.statements.toLocaleString()}
                label="Public Statements"
              />
              <StatCard
                icon={DollarSign}
                value={mockPolitician.stats.donors.toLocaleString()}
                label="Campaign Donors"
              />
            </div>
          </div>
        </section>

        {/* Tabs Content */}
        <section className="py-8">
          <div className="container">
            <Tabs defaultValue="voting" className="space-y-8">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="voting">Voting Record</TabsTrigger>
                <TabsTrigger value="donors">Donors</TabsTrigger>
                <TabsTrigger value="statements">Statements</TabsTrigger>
                <TabsTrigger value="transparency">Data Transparency</TabsTrigger>
              </TabsList>

              <TabsContent value="voting" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground mb-1">
                      Voting Record
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Breakdown by legislative category
                      <CitationBadge citation={citation} index={1} />
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <VotingChart data={mockPolitician.votingData} />
              </TabsContent>

              <TabsContent value="donors" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground mb-1">
                      Campaign Donors
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Breakdown by industry
                      <CitationBadge citation={citation} index={2} />
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <DonorBreakdown
                  data={mockPolitician.donorData}
                  totalDonations={mockPolitician.totalDonations}
                />
              </TabsContent>

              <TabsContent value="statements" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Public Statements
                  </h2>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>

                <div className="space-y-4">
                  {mockPolitician.statements.map((statement) => (
                    <div key={statement.id} className="civic-card p-6">
                      <Quote className="h-6 w-6 text-accent mb-3" />
                      <p className="text-foreground mb-4 leading-relaxed text-lg">
                        "{statement.text}"
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{statement.date}</span>
                          <span>•</span>
                          <span>{statement.source}</span>
                        </div>
                        <a
                          href={statement.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="transparency" className="space-y-6">
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Data Transparency Dashboard
                </h2>

                <div className="civic-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Data Completeness
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Voting Records</span>
                        <span className="font-medium text-foreground">98%</span>
                      </div>
                      <Progress value={98} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Donor Data</span>
                        <span className="font-medium text-foreground">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Public Statements</span>
                        <span className="font-medium text-foreground">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="civic-card p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Known Data Gaps
                  </h3>
                  <ul className="space-y-3">
                    {mockPolitician.dataGaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                        <span className="text-muted-foreground">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
