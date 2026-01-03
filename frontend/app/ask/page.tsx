"use client";

import { useState, Suspense } from "react";
import { CitationBadge } from "@/components/CitationBadge";
import {
  Sparkles,
  Send,
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: {
    id: string;
    source: string;
    url: string;
    date: string;
    type: "vote" | "statement" | "donation";
  }[];
  confidence?: "high" | "medium" | "low";
}

const suggestedQuestions = [
  "What is Elizabeth Warren's stance on healthcare?",
  "How did Marco Rubio vote on climate legislation?",
  "Compare voting records on immigration reform",
  "Who are the top donors to senators from Texas?",
];

const mockConversation: Message[] = [
  {
    id: "1",
    role: "user",
    content: "What is Elizabeth Warren's stance on healthcare?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Based on verified voting records and public statements, Senator Elizabeth Warren has consistently supported healthcare expansion legislation. Key findings:\n\n• Voted YES on the Affordable Care Act expansion bill (2021)\n• Co-sponsored Medicare for All legislation (S.1129)\n• Publicly advocated for prescription drug price controls in 47 verified statements\n\nWarren has voted in favor of healthcare-related legislation 94% of the time since taking office in 2013.",
    citations: [
      {
        id: "1",
        source: "Congress.gov",
        url: "https://www.congress.gov/bill/117th-congress/senate-bill/1129",
        date: "2021-04-21",
        type: "vote",
      },
      {
        id: "2",
        source: "GovTrack.us",
        url: "https://www.govtrack.us/congress/members/elizabeth_warren/412542",
        date: "2024-01-15",
        type: "vote",
      },
    ],
    confidence: "high",
  },
];

function AskPageContent() {
  const [messages, setMessages] = useState<Message[]>(mockConversation);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I found relevant information based on verified records. This response would include factual data with citations from official sources.",
        citations: [
          {
            id: "1",
            source: "Congress.gov",
            url: "https://www.congress.gov",
            date: "2024-01-15",
            type: "vote",
          },
        ],
        confidence: "high",
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    const configs = {
      high: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "High Confidence",
      },
      medium: {
        color: "bg-amber-100 text-amber-800",
        icon: AlertCircle,
        label: "Medium Confidence",
      },
      low: {
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
        label: "Low Confidence",
      },
    };
    const config = configs[confidence];
    return (
      <Badge variant="secondary" className={config.color}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Page Header */}
      <section className="py-8 bg-card border-b border-border">
        <div className="container">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">
                Ask CivicLens AI
              </h1>
              <p className="text-sm text-muted-foreground">
                Evidence-based answers with verified citations
              </p>
            </div>
          </div>

          {/* AI Principles Notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <Lightbulb className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">
                Responsible AI Guidelines
              </p>
              <p className="text-muted-foreground">
                CivicLens AI only provides factual, cited information. We do not
                make predictions, rankings, or recommendations. All responses
                include source citations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Area */}
      <section className="flex-1 py-6 overflow-y-auto">
        <div className="container max-w-4xl">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
                What would you like to know?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Ask questions about politicians&apos; voting records, donors, or
                public statements.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="text-left"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="p-2 rounded-lg bg-accent">
                        <Bot className="h-5 w-5 text-accent-foreground" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-2xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    } rounded-xl p-4`}
                  >
                    {message.role === "assistant" && message.confidence && (
                      <div className="mb-3">
                        {getConfidenceBadge(message.confidence)}
                      </div>
                    )}

                    <p className="whitespace-pre-line leading-relaxed">
                      {message.content}
                    </p>

                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Sources:
                        </p>
                        <div className="space-y-2">
                          {message.citations.map((citation, index) => (
                            <div
                              key={citation.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CitationBadge
                                citation={citation}
                                index={index + 1}
                              />
                              <span className="text-muted-foreground">
                                {citation.source}
                              </span>
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="p-2 rounded-lg bg-primary">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-accent">
                      <Bot className="h-5 w-5 text-accent-foreground" />
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                        <div
                          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Searching verified records...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Input Area */}
      <section className="sticky bottom-0 py-4 bg-background border-t border-border">
        <div className="container max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <Input
              type="text"
              placeholder="Ask about a politician's voting record, donors, or statements..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-12"
            />
            <Button type="submit" size="lg" disabled={isLoading}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-3">
            All responses are based on verified data sources. CivicLens AI does
            not make predictions or recommendations.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <AskPageContent />
    </Suspense>
  );
}
