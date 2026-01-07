import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  coach_id: string;
  created_at: string;
  updated_at: string;
}

interface UseChatOptions {
  partnerId: string; // The other person in the chat (coach for client, client for coach)
}

export function useChat({ partnerId }: UseChatOptions) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get or create conversation
  const getOrCreateConversation = useCallback(async () => {
    if (!user || !partnerId) return null;

    const clientId = role === "client" ? user.id : partnerId;
    const coachId = role === "coach" ? user.id : partnerId;

    // Try to get existing conversation
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("client_id", clientId)
      .eq("coach_id", coachId)
      .maybeSingle();

    if (existing) {
      return existing as Conversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from("chat_conversations")
      .insert({ client_id: clientId, coach_id: coachId })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }

    return newConversation as Conversation;
  }, [user, partnerId, role]);

  // Fetch messages
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return data as ChatMessage[];
  }, []);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  }, [user]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!user || !conversation || !text.trim()) return false;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          message: text.trim(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again.",
      });
      return false;
    } finally {
      setIsSending(false);
    }
  }, [user, conversation, toast]);

  // Initialize chat
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIsLoading(true);
      const conv = await getOrCreateConversation();
      
      if (!mounted) return;
      
      if (conv) {
        setConversation(conv);
        const msgs = await fetchMessages(conv.id);
        if (mounted) {
          setMessages(msgs);
          markAsRead(conv.id);
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    if (user && partnerId) {
      init();
    }

    return () => {
      mounted = false;
    };
  }, [user, partnerId, getOrCreateConversation, fetchMessages, markAsRead]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Mark as read if not from current user
          if (newMessage.sender_id !== user?.id) {
            markAsRead(conversation.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversation, user, markAsRead]);

  return {
    conversation,
    messages,
    isLoading,
    isSending,
    sendMessage,
    refetch: () => conversation && fetchMessages(conversation.id).then(setMessages),
  };
}
