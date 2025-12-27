import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CheckCircle,
  Shield,
  Eye,
  AlertCircle,
  Scale,
  Users,
  FileText,
  Database,
  Lock,
  BookOpen,
  Target,
  Heart,
} from "lucide-react";

const principles = [
  {
    icon: CheckCircle,
    title: "Evidence Only",
    description:
      "Every piece of data on CivicLens is backed by verifiable sources. We only present information that can be traced to official records, published statements, or documented filings.",
  },
  {
    icon: Shield,
    title: "No Rankings or Endorsements",
    description:
      "We do not rank politicians, calculate 'scores,' or make any endorsements. Our role is to provide facts, not influence opinion.",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description:
      "Our methodology, data sources, and limitations are publicly documented. Users can trace any piece of information back to its original source.",
  },
  {
    icon: AlertCircle,
    title: "No Predictions",
    description:
      "CivicLens AI does not predict how politicians will vote, what policies they might support, or election outcomes. We present only what has already occurred.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "We do not track user searches, build profiles, or share any user data. Your research is private and remains private.",
  },
  {
    icon: Scale,
    title: "Non-Partisan",
    description:
      "CivicLens presents information without partisan framing. We apply the same standards equally to all politicians regardless of party affiliation.",
  },
];

const dataSources = [
  {
    icon: FileText,
    title: "Congressional Records",
    description: "Official voting records from Congress.gov and the Library of Congress.",
  },
  {
    icon: Database,
    title: "Campaign Finance",
    description: "FEC filings and OpenSecrets.org donor data.",
  },
  {
    icon: BookOpen,
    title: "Public Statements",
    description: "Official press releases, verified social media, and congressional testimony.",
  },
  {
    icon: Users,
    title: "Committee Records",
    description: "Committee assignments, hearings, and legislative sponsorship data.",
  },
];

const limitations = [
  "We cannot guarantee real-time data updates; some records may have a delay of 24-48 hours.",
  "Not all state and local politicians are covered; our primary focus is federal elected officials.",
  "Historical records before 2000 may have incomplete citation information.",
  "AI-generated summaries are based only on available data and may not capture all nuances.",
  "Donor data reflects reported contributions only; dark money is not included in our analysis.",
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-sm font-medium mb-8">
                <Scale className="h-4 w-4" />
                <span>About CivicLens</span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                Clarity for Democracy
              </h1>
              <p className="text-lg text-primary-foreground/80 leading-relaxed">
                CivicLens is an independent, non-partisan platform dedicated to providing 
                evidence-based political information. We believe that an informed electorate 
                is essential to a healthy democracy.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-accent">
                  <Target className="h-6 w-6 text-accent-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Our Mission
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In an era of information overload and increasing polarization, CivicLens 
                  provides a space for citizens to access factual political information 
                  without spin, ranking, or partisan framing.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We aggregate public records—voting histories, campaign finance data, and 
                  official statements—and present them in an accessible, searchable format. 
                  Our AI technology helps users find relevant information quickly while 
                  maintaining rigorous citation standards.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  CivicLens does not tell you what to think. We give you the verified facts 
                  so you can form your own conclusions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="py-16 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
                Responsible AI Principles
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                CivicLens is built on a foundation of ethical AI practices. These principles 
                guide every feature we build and every piece of content we present.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {principles.map((principle, index) => (
                <div key={index} className="civic-card p-6">
                  <div className="p-3 rounded-xl bg-primary/10 inline-flex mb-4">
                    <principle.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section id="methodology" className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-accent">
                  <Database className="h-6 w-6 text-accent-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Data Sources & Methodology
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-8">
                CivicLens aggregates data from authoritative public sources. Every piece 
                of information on our platform can be traced back to its original source.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dataSources.map((source, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                    <div className="p-2 rounded-lg bg-card">
                      <source.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{source.title}</h4>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Transparency */}
        <section id="transparency" className="py-16 bg-card">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-accent">
                  <Eye className="h-6 w-6 text-accent-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Transparency & Limitations
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-8">
                We believe in being upfront about what CivicLens can and cannot do. 
                Here are the current limitations of our platform:
              </p>

              <ul className="space-y-4">
                {limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-accent mb-6">
                <Heart className="h-6 w-6 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                Support Our Mission
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                CivicLens is committed to remaining free and accessible to all citizens. 
                We rely on grants, institutional partnerships, and individual contributions 
                to sustain our work.
              </p>
              <p className="text-sm text-muted-foreground">
                For partnership inquiries, contact us at{" "}
                <a href="mailto:partnerships@civiclens.org" className="text-primary hover:underline">
                  partnerships@civiclens.org
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
