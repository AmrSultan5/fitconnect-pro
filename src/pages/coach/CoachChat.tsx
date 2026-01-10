import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { ChatWindow } from "@/components/chat";
import { CoachChatHeader } from "@/components/chat/CoachChatHeader";
import { ChatSuggestions } from "@/components/chat/ChatSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CoachChat() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const [clientName, setClientName] = useState<string>("Client");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [suggestedMessage, setSuggestedMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkAccessAndFetchClient = async () => {
      if (!user || !clientId) return;

      setIsLoading(true);

      // Verify coach has access to this client
      const { data: assignment } = await supabase
        .from("coach_client_assignments")
        .select("coach_id, client_id")
        .eq("coach_id", user.id)
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();

      if (assignment) {
        setHasAccess(true);

        // Get client name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", clientId)
          .maybeSingle();

        if (profile) {
          setClientName(profile.full_name || profile.email);
        }
      } else {
        setHasAccess(false);
      }

      setIsLoading(false);
    };

    checkAccessAndFetchClient();
  }, [user, clientId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Card className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-center p-8">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            You don't have access to chat with this client.
          </p>
          <Button asChild>
            <Link to="/coach">Back to Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
        <CoachChatHeader clientId={clientId!} clientName={clientName} />
        <ChatSuggestions 
          clientId={clientId!} 
          onUseSuggestion={(msg) => setSuggestedMessage(msg)} 
        />
        <ChatWindow 
          partnerId={clientId!} 
          partnerName={clientName}
          initialMessage={suggestedMessage}
          onMessageSent={() => setSuggestedMessage(null)}
        />
      </Card>
    </DashboardLayout>
  );
}
