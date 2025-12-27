import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IssueCard } from "@/components/IssueCard";
import {
  Heart,
  Leaf,
  DollarSign,
  Globe,
  Shield,
  GraduationCap,
  Home,
  Scale,
  Zap,
  Users,
  Building,
  Briefcase,
} from "lucide-react";

const issues = [
  {
    id: "healthcare",
    title: "Healthcare",
    description: "Medical coverage, prescription drug costs, Medicare, Medicaid, and healthcare reform legislation.",
    icon: Heart,
    politicianCount: 534,
    voteCount: 2847,
    color: "bg-red-500/20",
  },
  {
    id: "climate",
    title: "Climate & Environment",
    description: "Environmental protection, clean energy initiatives, emissions standards, and climate policy.",
    icon: Leaf,
    politicianCount: 489,
    voteCount: 1956,
    color: "bg-green-500/20",
  },
  {
    id: "economy",
    title: "Economy & Jobs",
    description: "Economic policy, job creation, workforce development, and labor legislation.",
    icon: DollarSign,
    politicianCount: 534,
    voteCount: 3241,
    color: "bg-amber-500/20",
  },
  {
    id: "immigration",
    title: "Immigration",
    description: "Border security, visa programs, DACA, and comprehensive immigration reform.",
    icon: Globe,
    politicianCount: 412,
    voteCount: 1523,
    color: "bg-blue-500/20",
  },
  {
    id: "defense",
    title: "Defense & Security",
    description: "Military spending, national security, veterans affairs, and foreign policy.",
    icon: Shield,
    politicianCount: 534,
    voteCount: 2156,
    color: "bg-slate-500/20",
  },
  {
    id: "education",
    title: "Education",
    description: "K-12 funding, higher education, student loans, and school choice policies.",
    icon: GraduationCap,
    politicianCount: 478,
    voteCount: 1834,
    color: "bg-purple-500/20",
  },
  {
    id: "housing",
    title: "Housing",
    description: "Affordable housing, homelessness, rent control, and homeownership programs.",
    icon: Home,
    politicianCount: 356,
    voteCount: 987,
    color: "bg-orange-500/20",
  },
  {
    id: "justice",
    title: "Criminal Justice",
    description: "Police reform, sentencing reform, prison conditions, and civil rights.",
    icon: Scale,
    politicianCount: 423,
    voteCount: 1456,
    color: "bg-indigo-500/20",
  },
  {
    id: "energy",
    title: "Energy",
    description: "Renewable energy, oil and gas policy, nuclear power, and energy independence.",
    icon: Zap,
    politicianCount: 445,
    voteCount: 1678,
    color: "bg-yellow-500/20",
  },
  {
    id: "civil-rights",
    title: "Civil Rights",
    description: "Voting rights, equality legislation, discrimination, and civil liberties.",
    icon: Users,
    politicianCount: 489,
    voteCount: 1234,
    color: "bg-pink-500/20",
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "Transportation, roads, bridges, broadband, and public works projects.",
    icon: Building,
    politicianCount: 512,
    voteCount: 1567,
    color: "bg-cyan-500/20",
  },
  {
    id: "small-business",
    title: "Small Business",
    description: "Small business support, entrepreneurship, tax relief, and regulatory reform.",
    icon: Briefcase,
    politicianCount: 398,
    voteCount: 876,
    color: "bg-teal-500/20",
  },
];

export default function Issues() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 bg-card border-b border-border">
          <div className="container">
            <div className="max-w-2xl">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                Issue Explorer
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Navigate political data by topic area. Discover which politicians have 
                taken notable votes or made public statements on the issues that matter 
                most to you.
              </p>
            </div>
          </div>
        </section>

        {/* Issues Grid */}
        <section className="py-12">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {issues.map((issue) => (
                <IssueCard key={issue.id} {...issue} />
              ))}
            </div>
          </div>
        </section>

        {/* Data Transparency Notice */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                How We Categorize Issues
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Each piece of legislation is categorized based on its primary focus using 
                standardized Congressional Research Service (CRS) subject codes. Bills 
                addressing multiple topics may appear in multiple categories to ensure 
                comprehensive coverage.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className="verified-badge">
                  <Shield className="h-4 w-4" />
                  <span>Official CRS Codes</span>
                </div>
                <div className="verified-badge">
                  <Scale className="h-4 w-4" />
                  <span>Non-partisan Classification</span>
                </div>
                <div className="verified-badge">
                  <Users className="h-4 w-4" />
                  <span>Peer Reviewed</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
