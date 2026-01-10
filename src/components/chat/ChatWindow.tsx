import { useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { isSameDay, parseISO } from "date-fns";

interface ChatWindowProps {
  partnerId: string;
  partnerName?: string;
  initialMessage?: string | null;
  onMessageSent?: () => void;
}

export function ChatWindow({ partnerId, partnerName, initialMessage, onMessageSent }: ChatWindowProps) {
  const { user } = useAuth();
  const { messages, isLoading, isSending, sendMessage } = useChat({ partnerId });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSend = async (text: string) => {
    const success = await sendMessage(text);
    if (success && onMessageSent) {
      onMessageSent();
    }
    return success;
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: Date; messages: ChatMessage[] }[]>(
    (groups, message) => {
      const messageDate = parseISO(message.created_at);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }

      return groups;
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Start a conversation</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
              Send a message to {partnerName || "your partner"} to get started
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <DateSeparator date={group.date} />
                <div className="space-y-2">
                  {group.messages.map((msg, msgIndex) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg.message}
                      timestamp={msg.created_at}
                      isOwn={msg.sender_id === user?.id}
                      isRead={msg.is_read}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} isSending={isSending} initialValue={initialMessage || undefined} />
    </div>
  );
}
