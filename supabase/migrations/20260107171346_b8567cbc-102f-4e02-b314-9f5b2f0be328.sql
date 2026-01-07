-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    coach_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, coach_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
ON public.chat_conversations
FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = coach_id);

CREATE POLICY "Clients can create conversations with their assigned coach"
ON public.chat_conversations
FOR INSERT
WITH CHECK (
    auth.uid() = client_id 
    AND is_coach_of_client(coach_id, client_id)
);

CREATE POLICY "Coaches can create conversations with their assigned clients"
ON public.chat_conversations
FOR INSERT
WITH CHECK (
    auth.uid() = coach_id 
    AND is_coach_of_client(coach_id, client_id)
);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.coach_id = auth.uid())
    )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.coach_id = auth.uid())
    )
);

CREATE POLICY "Users can update read status of messages sent to them"
ON public.chat_messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = conversation_id
        AND (
            (c.client_id = auth.uid() AND sender_id = c.coach_id)
            OR (c.coach_id = auth.uid() AND sender_id = c.client_id)
        )
    )
);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_conversations_client_id ON public.chat_conversations(client_id);
CREATE INDEX idx_chat_conversations_coach_id ON public.chat_conversations(coach_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create trigger to update conversation updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();