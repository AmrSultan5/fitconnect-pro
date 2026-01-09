import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, Check, Clock, X, Send } from "lucide-react";
import { CoachingRequestForm } from "@/components/coach/CoachingRequestForm";
import { useCoachingRequests } from "@/hooks/useCoachingRequests";

interface Coach {
  user_id: string;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  training_philosophy: string | null;
  full_name: string | null;
}

export default function CoachProfile() {
  const { coachId } = useParams<{ coachId: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [currentCoach, setCurrentCoach] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const { getRequestStatus, refetch } = useCoachingRequests();

  useEffect(() => {
    if (coachId) fetchCoach();
    if (user && role === "client") checkCurrentCoach();
  }, [coachId, user, role]);

  const fetchCoach = async () => {
    const { data } = await supabase
      .from("coach_profiles")
      .select("user_id, bio, specialties, experience_years, training_philosophy")
      .eq("user_id", coachId)
      .maybeSingle();
    if (data) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", data.user_id)
        .maybeSingle();
      setCoach({ ...data, full_name: p?.full_name || null });
    }
  };

  const checkCurrentCoach = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_client_assignments")
      .select("coach_id")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (data) setCurrentCoach(data.coach_id);
  };

  if (!coach) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Coach not found</p>
          <Button variant="link" onClick={() => navigate("/coaches")}>
            Back to coaches
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const initials = coach.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "C";
  const isCurrent = currentCoach === coach.user_id;
  const requestStatus = coachId ? getRequestStatus(coachId) : null;

  const renderActionButton = () => {
    if (role !== "client") return null;
    
    if (isCurrent) {
      return (
        <Badge className="gap-1 px-4 py-2 text-base">
          <Check className="h-4 w-4" />
          Your Coach
        </Badge>
      );
    }

    if (requestStatus) {
      switch (requestStatus.status) {
        case "pending":
          return (
            <Badge variant="secondary" className="gap-1 px-4 py-2 text-base">
              <Clock className="h-4 w-4" />
              Request Pending
            </Badge>
          );
        case "rejected":
          return (
            <div className="text-right space-y-2">
              <Badge variant="destructive" className="gap-1 px-4 py-2">
                <X className="h-4 w-4" />
                Request Declined
              </Badge>
              {requestStatus.coach_response && (
                <p className="text-sm text-muted-foreground max-w-xs">
                  "{requestStatus.coach_response}"
                </p>
              )}
            </div>
          );
        case "accepted":
          return (
            <Badge className="gap-1 px-4 py-2 text-base">
              <Check className="h-4 w-4" />
              Your Coach
            </Badge>
          );
        default:
          break;
      }
    }

    return (
      <Button size="lg" onClick={() => setShowRequestForm(true)} className="gap-2">
        <Send className="h-4 w-4" />
        Request Coaching
      </Button>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/coaches")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Coaches
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24 border-4 border-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <CardTitle className="text-2xl">{coach.full_name || "Coach"}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-base mt-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {coach.experience_years || 0} years experience
                  </CardDescription>
                </div>
                {coach.specialties && coach.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((s, i) => (
                      <Badge key={i} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:self-start">{renderActionButton()}</div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {coach.bio && (
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-muted-foreground leading-relaxed">{coach.bio}</p>
              </div>
            )}
            
            {coach.bio && coach.training_philosophy && <Separator />}
            
            {coach.training_philosophy && (
              <div>
                <h3 className="font-semibold mb-2">Training Philosophy</h3>
                <p className="text-muted-foreground leading-relaxed">{coach.training_philosophy}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coaching Request Form */}
        <CoachingRequestForm
          open={showRequestForm}
          onOpenChange={(open) => {
            setShowRequestForm(open);
            if (!open) refetch();
          }}
          coachId={coachId || ""}
          coachName={coach.full_name || "Coach"}
        />
      </div>
    </DashboardLayout>
  );
}
