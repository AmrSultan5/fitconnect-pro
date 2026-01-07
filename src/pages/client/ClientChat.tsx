import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { ChatWindow, ChatHeader } from "@/components/chat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ClientChat() {
  const { user } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>("Your Coach");
  const [isLoading, setIsLoading] = useState(true);
  const [hasCoach, setHasCoach] = useState(false);

  useEffect(() => {
    const fetchCoach = async () => {
      if (!user) return;

      setIsLoading(true);

      // Get active coach assignment
      const { data: assignment } = await supabase
        .from("coach_client_assignments")
        .select("coach_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (assignment) {
        setCoachId(assignment.coach_id);
        setHasCoach(true);

        // Get coach name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", assignment.coach_id)
          .maybeSingle();

        if (profile) {
          setCoachName(profile.full_name || profile.email);
        }
      } else {
        setHasCoach(false);
      }

      setIsLoading(false);
    };

    fetchCoach();
  }, [user]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasCoach || !coachId) {
    return (
      <DashboardLayout>
        <Card className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-center p-8">
          <div className="rounded-full bg-muted p-4 mb-4">
            <UserX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Coach Assigned</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            You need to have a coach assigned to use the chat feature. 
            Find a coach from our marketplace to get started.
          </p>
          <Button asChild>
            <Link to="/coaches">
              <MessageSquare className="mr-2 h-4 w-4" />
              Find a Coach
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
        <ChatHeader 
          name={coachName} 
          subtitle="Your Coach"
          backTo="/client"
        />
        <ChatWindow 
          partnerId={coachId} 
          partnerName={coachName}
        />
      </Card>
    </DashboardLayout>
  );
}
