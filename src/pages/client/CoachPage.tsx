import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, UserCircle, ArrowLeft, Star, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface CoachData {
  coachId: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[] | null;
  experienceYears: number | null;
}

export default function CoachPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingCoach, setIsChangingCoach] = useState(false);

  const fetchCoachData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch active coach assignment
      const { data: assignment } = await supabase
        .from("coach_client_assignments")
        .select("coach_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

        if (!assignment?.coach_id) {
          setCoach(null);
          navigate("/coaches");
          return;
        }        

      // Fetch coach profile
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", assignment.coach_id)
        .maybeSingle();

      // Fetch coach details
      const { data: coachData } = await supabase
        .from("coach_profiles")
        .select("bio, specialties, experience_years")
        .eq("user_id", assignment.coach_id)
        .maybeSingle();

      if (coachProfile) {
        setCoach({
          coachId: assignment.coach_id,
          fullName: coachProfile.full_name,
          avatarUrl: coachProfile.avatar_url,
          bio: coachData?.bio || null,
          specialties: coachData?.specialties || null,
          experienceYears: coachData?.experience_years || null,
        });
      }
    } catch (error) {
      console.error("Error fetching coach data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load coach information.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  useEffect(() => {
    const onFocus = () => {
      fetchCoachData();
    };
  
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchCoachData]);  

  const handleChangeCoach = async () => {
    if (!user) return;
  
    setIsChangingCoach(true);
    try {
      const { error } = await supabase
        .from("coach_client_assignments")
        .update({ is_active: false })
        .eq("client_id", user.id)
        .eq("is_active", true);
  
      if (error) throw error;
  
      // ✅ IMPORTANT: clear local state immediately
      setCoach(null);
  
      toast({
        title: "Coach removed",
        description: "You can now select a new coach.",
      });
  
      navigate("/coaches");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change coach. Please try again.",
      });
    } finally {
      setIsChangingCoach(false);
    }
  };  

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">Loading coach information...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!coach) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No coach assigned</p>
                <Button onClick={() => navigate("/coaches")}>Find a Coach</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const initials = coach.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "C";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/client")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Coach Info Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {coach.avatarUrl ? (
                <img
                  src={coach.avatarUrl}
                  alt={coach.fullName || "Coach"}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 space-y-2">
                <CardTitle className="text-2xl flex items-center gap-2">
                  {coach.fullName || "Coach"}
                </CardTitle>
                {coach.experienceYears !== null && (
                  <CardDescription className="flex items-center gap-1 text-base">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {coach.experienceYears} years experience
                  </CardDescription>
                )}
                {coach.specialties && coach.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {coach.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/coaches/${coach.coachId}`}>View Profile</Link>
                </Button>
                <Button variant="outline" onClick={handleChangeCoach} disabled={isChangingCoach}>
                  <Settings className="mr-2 h-4 w-4" />
                  Change Coach
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {coach.bio && (
              <div>
                <h3 className="font-medium mb-2">About</h3>
                <p className="text-muted-foreground">{coach.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat with Your Coach
            </CardTitle>
            <CardDescription>Send messages and get support from your coach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed p-12 text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <p className="font-medium">Chat Coming Soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Direct messaging with your coach will be available soon. For now, you can view
                  your coach's profile and manage your plans.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

