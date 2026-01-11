"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  askAboutVisualization,
  type VisualizationQAResponse,
  type VisualizationType,
  type ConfidenceLevel,
} from "@/lib/visualization-ai";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  response?: VisualizationQAResponse;
}

interface VisualizationChatProps {
  visualizationType: VisualizationType;
  filters: Record<string, unknown>;
  dataSummary: Record<string, unknown>;
  selectedItems?: string[];
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onFollowUp?: (question: string) => void;
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-700",
};

const EXAMPLE_QUESTIONS = [
  "Which state has the highest donations?",
  "What's the trend over the past year?",
  "How do donations compare between parties?",
  "What categories dominate this view?",
];

function MessageBubble({
  message,
  onFollowUp,
}: {
  message: Message;
  onFollowUp?: (question: string) => void;
}) {
  const isUser = message.type === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-blue-500" : "bg-gradient-to-br from-amber-400 to-orange-500"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div
        className={`flex-1 max-w-[85%] ${isUser ? "text-right" : "text-left"}`}
      >
        <div
          className={`inline-block p-3 rounded-lg ${
            isUser
              ? "bg-blue-500 text-white rounded-br-sm"
              : "bg-gray-100 text-gray-900 rounded-bl-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Response details for assistant messages */}
        {!isUser && message.response && (
          <div className="mt-2 space-y-2">
            {/* Confidence badge */}
            <Badge
              variant="outline"
              className={`text-xs ${CONFIDENCE_COLORS[message.response.confidence]}`}
            >
              {message.response.confidence} confidence
            </Badge>

            {/* Supporting data */}
            {message.response.supporting_data.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {message.response.supporting_data.map((data, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs"
                    title={data.context || undefined}
                  >
                    {data.label}: {data.value}
                  </Badge>
                ))}
              </div>
            )}

            {/* Limitations */}
            {message.response.limitations && (
              <p className="text-xs text-gray-500 italic">
                Note: {message.response.limitations}
              </p>
            )}

            {/* Follow-up suggestions */}
            {message.response.follow_up_suggestions.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Related questions:</p>
                <div className="flex flex-wrap gap-1">
                  {message.response.follow_up_suggestions.slice(0, 3).map(
                    (suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => onFollowUp?.(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <span className="text-xs text-gray-400 mt-1 block">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export default function VisualizationChat({
  visualizationType,
  filters,
  dataSummary,
  selectedItems = [],
  className = "",
  isOpen = true,
  onClose,
  onFollowUp,
}: VisualizationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: question.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);

      try {
        const response = await askAboutVisualization({
          question: question.trim(),
          visualization_type: visualizationType,
          filters,
          data_summary: dataSummary,
          selected_items: selectedItems,
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: response.answer,
          timestamp: new Date(),
          response,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content:
            "Sorry, I couldn't process your question. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [visualizationType, filters, dataSummary, selectedItems, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleFollowUp = (question: string) => {
    sendMessage(question);
    onFollowUp?.(question);
  };

  if (!isOpen) return null;

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base">Ask about this data</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Ask me anything about this visualization
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {EXAMPLE_QUESTIONS.map((q, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => sendMessage(q)}
                      >
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onFollowUp={handleFollowUp}
                  />
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 rounded-bl-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-500">
                          Analyzing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <div className="p-3 border-t bg-gray-50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
