import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Star, ArrowRight, Check } from "lucide-react";

interface Coach { user_id: string; bio: string | null; specialties: string[] | null; experience_years: number | null; full_name: string | null; }

export default function CoachMarketplace() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [currentCoach, setCurrentCoach] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCoaches();
    if (user && role === "client") {
      setCurrentCoach(null); // 👈 RESET FIRST
      checkCurrentCoach();   // 👈 THEN REFETCH
    }
  }, [user, role]);  

  const fetchCoaches = async () => {
    const { data } = await supabase.from("coach_profiles").select("user_id, bio, specialties, experience_years").eq("is_active", true).eq("is_approved", true);
    if (data) {
      const withNames = await Promise.all(data.map(async c => {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", c.user_id).maybeSingle();
        return { ...c, full_name: p?.full_name || null };
      }));
      setCoaches(withNames);
    }
  };

  const checkCurrentCoach = async () => {
    if (!user) return;
    const { data } = await supabase.from("coach_client_assignments").select("coach_id").eq("client_id", user.id).eq("is_active", true).maybeSingle();
    if (data) setCurrentCoach(data.coach_id);
  };

  const joinCoach = async (coachId: string) => {
    if (!user || isLoading) return;
  
    setIsLoading(true);
  
    try {
      // 1️⃣ Deactivate any active assignment
      await supabase
        .from("coach_client_assignments")
        .update({ is_active: false })
        .eq("client_id", user.id)
        .eq("is_active", true);
  
      // 2️⃣ Reactivate OR insert
      const { error } = await supabase
        .from("coach_client_assignments")
        .upsert(
          {
            client_id: user.id,
            coach_id: coachId,
            is_active: true,
          },
          {
            onConflict: "client_id,coach_id",
          }
        );
  
      if (error) throw error;
  
      setCurrentCoach(coachId);
  
      toast({
        title: "Welcome!",
        description: "You've joined the program.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join coach.",
      });
    } finally {
      setIsLoading(false);
    }
  };  

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Find a Coach</h1><p className="text-muted-foreground">Browse certified coaches</p></div>
        {coaches.length === 0 ? <Card><CardContent className="py-12 text-center"><Dumbbell className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4"/><p>No coaches available</p></CardContent></Card> : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coaches.map(c => {
              const initials = c.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "C";
              const isCurrent = currentCoach === c.user_id;
              return (
                <Card key={c.user_id} className={isCurrent ? "border-primary" : ""}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback></Avatar>
                      <div className="flex-1"><div className="flex items-center gap-2 font-semibold">
                        <span>{c.full_name || "Coach"}</span>

                        {isCurrent && (
                          <Badge className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Your Coach
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning"/>{c.experience_years || 0} yrs</p></div>
                    </div>
                    {c.bio && <p className="text-sm text-muted-foreground line-clamp-2">{c.bio}</p>}
                    {c.specialties && c.specialties.length > 0 && <div className="flex flex-wrap gap-1">{c.specialties.slice(0, 3).map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}</div>}
                    <div className="flex gap-2">
                      <Link to={`/coaches/${c.user_id}`} className="flex-1"><Button variant="outline" className="w-full">View</Button></Link>
                      {role === "client" && !isCurrent && <Button onClick={() => joinCoach(c.user_id)} disabled={isLoading} className="flex-1">Train<ArrowRight className="ml-2 h-4 w-4"/></Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
