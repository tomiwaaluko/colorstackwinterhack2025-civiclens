import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { IssueCard } from "@/components/IssueCard";
import { StatCard } from "@/components/StatCard";
import {
  CheckCircle,
  Shield,
  Eye,
  Scale,
  Heart,
  Leaf,
  DollarSign,
  Users,
  Globe,
  ArrowRight,
  Sparkles,
  FileText,
  Vote,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const issues = [
  {
    id: "healthcare",
    title: "Healthcare",
    description: "Medical coverage, prescription drug costs, and healthcare reform legislation.",
    icon: Heart,
    politicianCount: 534,
    voteCount: 2847,
    color: "bg-red-500/20",
  },
  {
    id: "climate",
    title: "Climate & Environment",
    description: "Environmental protection, clean energy initiatives, and climate policy.",
    icon: Leaf,
    politicianCount: 489,
    voteCount: 1956,
    color: "bg-green-500/20",
  },
  {
    id: "economy",
    title: "Economy & Jobs",
    description: "Economic policy, job creation, and workforce development legislation.",
    icon: DollarSign,
    politicianCount: 534,
    voteCount: 3241,
    color: "bg-amber-500/20",
  },
  {
    id: "immigration",
    title: "Immigration",
    description: "Border security, visa programs, and immigration reform policies.",
    icon: Globe,
    politicianCount: 412,
    voteCount: 1523,
    color: "bg-blue-500/20",
  },
];

const principles = [
  {
    icon: CheckCircle,
    title: "Evidence Only",
    description: "Every piece of data is backed by verifiable sources and official records.",
  },
  {
    icon: Shield,
    title: "No Rankings",
    description: "We present facts without ratings, rankings, or endorsements of any kind.",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description: "Our methodology and data sources are publicly available for scrutiny.",
  },
];

export default function Index() {
  const navigate = useNavigate();

  const handleSearch = (query: string, zip: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}&zip=${encodeURIComponent(zip)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 civic-gradient opacity-5" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-sm font-medium text-accent-foreground mb-8">
              <Scale className="h-4 w-4" />
              <span>Transparency First. Evidence-Based Political Insight.</span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6 leading-tight">
              Democracy Deserves{" "}
              <span className="relative">
                <span className="relative z-10">Clarity</span>
                <span className="absolute bottom-2 left-0 w-full h-3 gold-accent-gradient opacity-40 -z-0" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Search, compare, and understand your representatives—backed by evidence, not opinions.
              Access verified voting records, donor data, and public statements.
            </p>

            <SearchBar onSearch={handleSearch} />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Button asChild size="lg" variant="outline" className="group">
                <Link to="/ask">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Ask CivicLens AI
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/compare">
                  <Users className="h-5 w-5 mr-2" />
                  Compare Politicians
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card/50">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Vote}
              value="2.4M+"
              label="Verified Votes Tracked"
            />
            <StatCard
              icon={FileText}
              value="850K+"
              label="Public Statements"
            />
            <StatCard
              icon={Building2}
              value="12,500+"
              label="Politicians Covered"
            />
            <StatCard
              icon={CheckCircle}
              value="99.2%"
              label="Citation Accuracy"
            />
          </div>
        </div>
      </section>

      {/* Issues Section */}
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                Explore by Issue
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Navigate political data by topic area. See which politicians have taken
                notable votes or made public statements on issues that matter to you.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/issues">
                View All Issues
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {issues.map((issue) => (
              <IssueCard key={issue.id} {...issue} />
            ))}
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Responsible AI Principles
            </h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              CivicLens is built on a foundation of ethical AI practices, ensuring
              our platform serves democracy, not division.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {principles.map((principle, index) => (
              <div
                key={index}
                className="text-center p-8 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10"
              >
                <div className="inline-flex p-4 rounded-xl bg-accent mb-6">
                  <principle.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">
                  {principle.title}
                </h3>
                <p className="text-primary-foreground/70 leading-relaxed">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild variant="secondary" size="lg">
              <Link to="/about">
                Learn About Our Methodology
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="civic-card p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-sm font-medium text-accent-foreground mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Powered by AI</span>
            </div>

            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ask CivicLens AI
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Get evidence-based answers to your political questions. Every response
              comes with verified citations and data sources.
            </p>

            <Button asChild size="lg">
              <Link to="/ask">
                Start Asking Questions
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
