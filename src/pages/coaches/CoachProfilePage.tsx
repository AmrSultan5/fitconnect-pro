import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Check, CreditCard } from "lucide-react";

interface Coach { user_id: string; bio: string | null; specialties: string[] | null; experience_years: number | null; training_philosophy: string | null; full_name: string | null; }

export default function CoachProfile() {
  const { coachId } = useParams<{ coachId: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [currentCoach, setCurrentCoach] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => { if (coachId) fetchCoach(); if (user && role === "client") checkCurrentCoach(); }, [coachId, user, role]);

  const fetchCoach = async () => {
    const { data } = await supabase.from("coach_profiles").select("user_id, bio, specialties, experience_years, training_philosophy").eq("user_id", coachId).maybeSingle();
    if (data) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", data.user_id).maybeSingle();
      setCoach({ ...data, full_name: p?.full_name || null });
    }
  };

  const checkCurrentCoach = async () => {
    if (!user) return;
    const { data } = await supabase.from("coach_client_assignments").select("coach_id").eq("client_id", user.id).eq("is_active", true).maybeSingle();
    if (data) setCurrentCoach(data.coach_id);
  };

  const confirmPayment = async () => {
    if (!user || !coachId) return;
    setIsLoading(true);
    await supabase.from("coach_client_assignments").update({ is_active: false }).eq("client_id", user.id);
    const { error } = await supabase.from("coach_client_assignments").insert({ coach_id: coachId, client_id: user.id, is_active: true });
    setIsLoading(false);
    setShowPayment(false);
    if (error) toast({ variant: "destructive", title: "Error" });
    else { setCurrentCoach(coachId); toast({ title: "Welcome!" }); navigate("/client"); }
  };

  if (!coach) return <DashboardLayout><div className="text-center py-12"><p className="text-muted-foreground">Coach not found</p><Button variant="link" onClick={() => navigate("/coaches")}>Back</Button></div></DashboardLayout>;

  const initials = coach.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "C";
  const isCurrent = currentCoach === coach.user_id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/coaches")} className="gap-2"><ArrowLeft className="h-4 w-4"/>Back</Button>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24"><AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback></Avatar>
              <div className="flex-1 space-y-2">
                <CardTitle className="text-2xl flex items-center gap-2">{coach.full_name || "Coach"}{isCurrent && <Badge><Check className="mr-1 h-3 w-3"/>Your Coach</Badge>}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-base"><Star className="h-4 w-4 fill-warning text-warning"/>{coach.experience_years || 0} years</CardDescription>
                {coach.specialties && <div className="flex flex-wrap gap-2 pt-2">{coach.specialties.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>}
              </div>
              {role === "client" && !isCurrent && <Button size="lg" onClick={() => setShowPayment(true)}>Train with {coach.full_name?.split(" ")[0] || "Coach"}</Button>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {coach.bio && <div><h3 className="font-medium mb-2">About</h3><p className="text-muted-foreground">{coach.bio}</p></div>}
            <Separator/>
            {coach.training_philosophy && <div><h3 className="font-medium mb-2">Philosophy</h3><p className="text-muted-foreground">{coach.training_philosophy}</p></div>}
          </CardContent>
        </Card>
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/>Complete Payment</DialogTitle><DialogDescription>Simulated payment - no real charge</DialogDescription></DialogHeader>
            <div className="py-4"><div className="rounded-lg bg-muted p-4"><div className="flex justify-between"><span>Monthly Coaching</span><span className="font-medium">$99.00</span></div></div><div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">💳 Demo Mode</div></div>
            <DialogFooter><Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button><Button onClick={confirmPayment} disabled={isLoading}>{isLoading ? "Processing..." : "Confirm"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
