import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle, UserX, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";

interface Client {
  client_id: string;
  full_name: string | null;
  email: string;
  goal: string | null;
  daysSinceGym: number;
}

export default function CoachDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, missedThreeOrMore: 0 });

  useEffect(() => { if (user) fetchClients(); }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    const { data: assignments } = await supabase.from("coach_client_assignments").select("client_id").eq("coach_id", user.id).eq("is_active", true);
    if (!assignments) return;

    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const clientsData = await Promise.all(assignments.map(async (a) => {
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", a.client_id).maybeSingle();
      const { data: clientProfile } = await supabase.from("client_profiles").select("goal").eq("user_id", a.client_id).maybeSingle();
      const { data: attendance } = await supabase.from("attendance").select("date, status").eq("user_id", a.client_id).gte("date", weekAgo).order("date", { ascending: false });
      const lastTrained = attendance?.find(att => att.status === "trained");
      const daysSinceGym = lastTrained ? Math.floor((Date.now() - new Date(lastTrained.date).getTime()) / 86400000) : 999;
      return { client_id: a.client_id, full_name: profile?.full_name || null, email: profile?.email || "", goal: clientProfile?.goal || null, daysSinceGym };
    }));
    setClients(clientsData);
    setStats({ total: clientsData.length, active: clientsData.filter(c => c.daysSinceGym < 3).length, inactive: clientsData.filter(c => c.daysSinceGym >= 7).length, missedThreeOrMore: clientsData.filter(c => c.daysSinceGym >= 3).length });
  };

  const flagged = clients.filter(c => c.daysSinceGym >= 3);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Coach Dashboard</h1><p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><Users className="h-5 w-5 text-primary"/></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-success/10 p-3"><TrendingUp className="h-5 w-5 text-success"/></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-warning/10 p-3"><AlertTriangle className="h-5 w-5 text-warning"/></div><div><p className="text-sm text-muted-foreground">3+ Days</p><p className="text-2xl font-bold">{stats.missedThreeOrMore}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-destructive/10 p-3"><UserX className="h-5 w-5 text-destructive"/></div><div><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold">{stats.inactive}</p></div></div></CardContent></Card>
        </div>
        {flagged.length > 0 && <Card className="border-warning/50"><CardHeader><CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5"/>Attention Needed</CardTitle></CardHeader><CardContent><div className="space-y-3">{flagged.map(c=><Link key={c.client_id} to={`/coach/clients/${c.client_id}`} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 hover:bg-secondary"><div><p className="font-medium">{c.full_name||c.email}</p><p className="text-sm text-muted-foreground">{c.goal||"No goal"}</p></div><Badge variant={c.daysSinceGym>=7?"destructive":"secondary"}><Calendar className="mr-1 h-3 w-3"/>{c.daysSinceGym}d</Badge></Link>)}</div></CardContent></Card>}
        <Card><CardHeader><CardTitle>All Clients</CardTitle><CardDescription><Link to="/coach/clients" className="text-primary hover:underline">View all →</Link></CardDescription></CardHeader><CardContent>{clients.length===0?<div className="text-center py-8 text-muted-foreground"><Users className="mx-auto h-12 w-12 opacity-50 mb-4"/><p>No clients yet</p></div>:<div className="space-y-3">{clients.slice(0,5).map(c=><Link key={c.client_id} to={`/coach/clients/${c.client_id}`} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"><div><p className="font-medium">{c.full_name||c.email}</p><p className="text-sm text-muted-foreground">{c.goal||"No goal"}</p></div><Badge variant={c.daysSinceGym<2?"default":c.daysSinceGym<4?"secondary":"destructive"}>{c.daysSinceGym<2?"Active":`${c.daysSinceGym}d ago`}</Badge></Link>)}</div>}</CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
