import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, Dumbbell } from "lucide-react";
import { format } from "date-fns";

interface Coach { user_id: string; is_approved: boolean; is_active: boolean; experience_years: number | null; full_name: string | null; email: string; }

export default function AdminDashboard() {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [stats, setStats] = useState({ totalCoaches: 0, approvedCoaches: 0, pendingCoaches: 0, totalClients: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: coachData } = await supabase.from("coach_profiles").select("user_id, is_approved, is_active, experience_years").order("created_at", { ascending: false });
    if (coachData) {
      const withProfiles = await Promise.all(coachData.map(async c => {
        const { data: p } = await supabase.from("profiles").select("full_name, email").eq("user_id", c.user_id).maybeSingle();
        return { ...c, full_name: p?.full_name || null, email: p?.email || "" };
      }));
      setCoaches(withProfiles);
      setStats(s => ({ ...s, totalCoaches: withProfiles.length, approvedCoaches: withProfiles.filter(c => c.is_approved).length, pendingCoaches: withProfiles.filter(c => !c.is_approved && c.is_active).length }));
    }
    const { count } = await supabase.from("client_profiles").select("*", { count: "exact", head: true });
    setStats(s => ({ ...s, totalClients: count || 0 }));
  };

  const toggleApproval = async (userId: string, approved: boolean) => {
    await supabase.from("coach_profiles").update({ is_approved: !approved }).eq("user_id", userId);
    toast({ title: approved ? "Unapproved" : "Approved" });
    fetchData();
  };

  const pending = coaches.filter(c => !c.is_approved && c.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><Dumbbell className="h-5 w-5 text-primary"/></div><div><p className="text-sm text-muted-foreground">Coaches</p><p className="text-2xl font-bold">{stats.totalCoaches}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-success/10 p-3"><UserCheck className="h-5 w-5 text-success"/></div><div><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold">{stats.approvedCoaches}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-warning/10 p-3"><UserX className="h-5 w-5 text-warning"/></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pendingCoaches}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-accent/10 p-3"><Users className="h-5 w-5 text-accent"/></div><div><p className="text-sm text-muted-foreground">Clients</p><p className="text-2xl font-bold">{stats.totalClients}</p></div></div></CardContent></Card>
        </div>
        {pending.length > 0 && <Card className="border-warning/50"><CardHeader><CardTitle className="flex items-center gap-2"><UserX className="h-5 w-5 text-warning"/>Pending Approvals</CardTitle></CardHeader><CardContent><div className="space-y-3">{pending.map(c=><div key={c.user_id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"><div><p className="font-medium">{c.full_name||c.email}</p><p className="text-sm text-muted-foreground">{c.experience_years||0} yrs exp</p></div><Button size="sm" onClick={()=>toggleApproval(c.user_id,false)}>Approve</Button></div>)}</div></CardContent></Card>}
        <Card><CardHeader><CardTitle>All Coaches</CardTitle></CardHeader><CardContent>{coaches.length===0?<div className="text-center py-8 text-muted-foreground"><Dumbbell className="mx-auto h-12 w-12 opacity-50 mb-4"/><p>No coaches</p></div>:<div className="space-y-3">{coaches.map(c=><div key={c.user_id} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">{c.full_name||c.email}</p><p className="text-sm text-muted-foreground">{c.email}</p></div><div className="flex items-center gap-2"><Badge variant={c.is_approved?"default":"secondary"}>{c.is_approved?"Approved":"Pending"}</Badge><Button size="sm" variant={c.is_approved?"outline":"default"} onClick={()=>toggleApproval(c.user_id,c.is_approved)}>{c.is_approved?"Unapprove":"Approve"}</Button></div></div>)}</div>}</CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
