"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { MessageSquare, ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
}

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  chats: ChatHistory[];
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
  chats: ChatHistory[];
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function SidebarProvider({ children, chats, currentChatId, onChatSelect, onDeleteChat, onNewChat }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, chats, currentChatId, onChatSelect, onDeleteChat, onNewChat }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function ChatSidebar() {
  const { isOpen, setIsOpen, chats, currentChatId, onChatSelect, onDeleteChat, onNewChat } = useSidebar();

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
            <div className="flex items-center justify-between mb-3">
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
            <Button
              onClick={onNewChat}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No saved chats yet
                  </p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`relative group rounded-lg mb-1 ${
                      currentChatId === chat.id ? "bg-muted" : ""
                    }`}
                  >
                    <button
                      onClick={() => onChatSelect(chat.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Chats saved in browser storage
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
