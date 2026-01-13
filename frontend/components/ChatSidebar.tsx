"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
}

const mockChats: ChatHistory[] = [
  {
    id: "1",
    title: "Healthcare Legislation",
    timestamp: new Date(2026, 0, 11, 14, 30),
    preview: "What is the Affordable Care Act?",
  },
  {
    id: "2",
    title: "Voting Records",
    timestamp: new Date(2026, 0, 11, 10, 15),
    preview: "How did senators vote on climate...",
  },
  {
    id: "3",
    title: "Campaign Finance",
    timestamp: new Date(2026, 0, 10, 16, 45),
    preview: "Who are the top donors to...",
  },
  {
    id: "4",
    title: "Congressional Process",
    timestamp: new Date(2026, 0, 10, 9, 20),
    preview: "How are laws made in Congress?",
  },
  {
    id: "5",
    title: "Committee Assignments",
    timestamp: new Date(2026, 0, 9, 11, 0),
    preview: "What committees is Senator...",
  },
];

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function ChatSidebar() {
  const { isOpen, setIsOpen } = useSidebar();

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-card border-r border-border transition-all duration-300 ease-in-out ${
          isOpen ? "w-[280px]" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full w-[280px]">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                Saved Chats
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {mockChats.map((chat) => (
                <button
                  key={chat.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors mb-1 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {chat.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {chat.preview}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(chat.timestamp)}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Chat history is local to this session
            </p>
          </div>
        </div>
      </aside>

      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-20 z-40 h-10 w-10 rounded-full shadow-lg bg-card"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
