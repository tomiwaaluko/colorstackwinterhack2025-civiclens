"use client";

import { useState, useEffect, Suspense } from "react";
import { CitationBadge } from "@/components/CitationBadge";
import { ChatSidebar, SidebarProvider, type ChatHistory } from "@/components/ChatSidebar";
import { askQuestion } from "@/lib/api";
import type { AIResponse, Citation as APICitation, Claim } from "@/lib/types";
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
  citations?: APICitation[];
  confidence?: "high" | "medium" | "low";
  claims?: Claim[];
}

interface SavedChat {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
}

const suggestedQuestions = [
  "What is Elizabeth Warren's stance on healthcare?",
  "How did Marco Rubio vote on climate legislation?",
  "Compare voting records on immigration reform",
  "Who are the top donors to senators from Texas?",
];

function AskPageContent() {
  const [chatHistory, setChatHistory] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load chats from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("civiclens-chats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const chats = parsed.map((chat: SavedChat) => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
        }));
        setChatHistory(chats);
      } catch (e) {
        console.error("Failed to load chats:", e);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem("civiclens-chats", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Save current chat when messages change
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const firstUserMessage = messages.find(m => m.role === "user")?.content || "New Chat";
      const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? "..." : "");
      const preview = firstUserMessage.slice(0, 60) + (firstUserMessage.length > 60 ? "..." : "");

      setChatHistory(prev => {
        const existing = prev.find(c => c.id === currentChatId);
        if (existing) {
          return prev.map(c => 
            c.id === currentChatId 
              ? { ...c, messages, title, preview, timestamp: new Date() }
              : c
          );
        } else {
          return [{
            id: currentChatId,
            title,
            preview,
            timestamp: new Date(),
            messages,
          }, ...prev];
        }
      });
    }
  }, [messages, currentChatId]);

  const handleNewChat = () => {
    setCurrentChatId(Date.now().toString());
    setMessages([]);
    setInput("");
  };

  const handleChatSelect = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setInput("");
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      handleNewChat();
    }
  };

  const chatsForSidebar: ChatHistory[] = chatHistory.map(chat => ({
    id: chat.id,
    title: chat.title,
    timestamp: chat.timestamp,
    preview: chat.preview,
  }));

  const handleSend = async () => {
    if (!input.trim()) return;

    // Create new chat if none exists
    if (!currentChatId) {
      setCurrentChatId(Date.now().toString());
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the real API
      const response = await askQuestion({
        question: input.trim(),
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        claims: response.claims,
        confidence: "high",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // Handle error with better logging
      console.error("API Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          `I apologize, but I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`,
        confidence: "low",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
    <SidebarProvider
      chats={chatsForSidebar}
      currentChatId={currentChatId}
      onChatSelect={handleChatSelect}
      onDeleteChat={handleDeleteChat}
      onNewChat={handleNewChat}
    >
      <div className="min-h-screen flex">
        {/* Chat Sidebar */}
        <ChatSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
                              key={citation.source_id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CitationBadge
                                citation={{
                                  id: citation.source_id,
                                  source: citation.title,
                                  url: citation.url,
                                  date: citation.retrieved_at,
                                  type: citation.publisher,
                                }}
                                index={index + 1}
                              />
                              <span className="text-muted-foreground">
                                {citation.publisher}
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
    </div>
    </SidebarProvider>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <AskPageContent />
    </Suspense>
  );
}

