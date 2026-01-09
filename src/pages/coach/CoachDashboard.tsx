import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle, UserX, TrendingUp, Calendar, Activity, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { PendingRequestsInbox } from "@/components/coach/PendingRequestsInbox";
import { useCoachingRequests } from "@/hooks/useCoachingRequests";

interface Client {
  client_id: string;
  full_name: string | null;
  email: string;
  goal: string | null;
  daysSinceGym: number;
  avatar_initials: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  atRisk: number;
  pendingRequests: number;
}

export default function CoachDashboard() {
  const { user } = useAuth();
  const { requests, pendingCount, refetch } = useCoachingRequests();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    atRisk: 0,
    pendingRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  useEffect(() => {
    setStats((prev) => ({ ...prev, pendingRequests: pendingCount }));
  }, [pendingCount]);

  const fetchClients = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: assignments } = await supabase
      .from("coach_client_assignments")
      .select("client_id")
      .eq("coach_id", user.id)
      .eq("is_active", true);

    if (!assignments || assignments.length === 0) {
      setClients([]);
      setStats({
        total: 0,
        active: 0,
        inactive: 0,
        atRisk: 0,
        pendingRequests: pendingCount,
      });
      setIsLoading(false);
      return;
    }

    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const clientsData = await Promise.all(
      assignments.map(async (a) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", a.client_id)
          .maybeSingle();
        const { data: clientProfile } = await supabase
          .from("client_profiles")
          .select("goal")
          .eq("user_id", a.client_id)
          .maybeSingle();
        const { data: attendance } = await supabase
          .from("attendance")
          .select("date, status")
          .eq("user_id", a.client_id)
          .gte("date", weekAgo)
          .order("date", { ascending: false });

        const lastTrained = attendance?.find((att) => att.status === "trained");
        const daysSinceGym = lastTrained
          ? Math.floor((Date.now() - new Date(lastTrained.date).getTime()) / 86400000)
          : 999;

        const initials = profile?.full_name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "?";

        return {
          client_id: a.client_id,
          full_name: profile?.full_name || null,
          email: profile?.email || "",
          goal: clientProfile?.goal || null,
          daysSinceGym,
          avatar_initials: initials,
        };
      })
    );

    setClients(clientsData);
    setStats({
      total: clientsData.length,
      active: clientsData.filter((c) => c.daysSinceGym < 3).length,
      inactive: clientsData.filter((c) => c.daysSinceGym >= 7).length,
      atRisk: clientsData.filter((c) => c.daysSinceGym >= 3 && c.daysSinceGym < 7).length,
      pendingRequests: pendingCount,
    });
    setIsLoading(false);
  };

  const atRiskClients = clients.filter((c) => c.daysSinceGym >= 3);

  const getStatusBadge = (daysSinceGym: number) => {
    if (daysSinceGym < 2) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
    }
    if (daysSinceGym < 4) {
      return <Badge variant="secondary">{daysSinceGym}d ago</Badge>;
    }
    if (daysSinceGym < 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          At Risk
        </Badge>
      );
    }
    return <Badge variant="destructive">Inactive</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={pendingCount > 0 ? "border-primary/50 bg-primary/5" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-3">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-yellow-100 dark:bg-yellow-900/30 p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">At Risk</p>
                  <p className="text-2xl font-bold">{stats.atRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-destructive/10 p-3">
                  <UserX className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Section */}
        {pendingCount > 0 && (
          <PendingRequestsInbox
            requests={requests}
            onResponded={() => {
              refetch();
              fetchClients();
            }}
          />
        )}

        {/* At Risk Section */}
        {atRiskClients.length > 0 && (
          <Card className="border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                Attention Needed
              </CardTitle>
              <CardDescription>Clients who haven't trained recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskClients.map((c) => (
                  <Link
                    key={c.client_id}
                    to={`/coach/clients/${c.client_id}`}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {c.avatar_initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.full_name || c.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.goal || "No goal set"}</p>
                    </div>
                    <Badge
                      variant={c.daysSinceGym >= 7 ? "destructive" : "secondary"}
                      className="gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      {c.daysSinceGym === 999 ? "Never" : `${c.daysSinceGym}d`}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Your Clients
                </CardTitle>
                <CardDescription>
                  {clients.length > 0
                    ? `Showing ${Math.min(clients.length, 8)} of ${clients.length} clients`
                    : "No active clients yet"}
                </CardDescription>
              </div>
              {clients.length > 0 && (
                <Link
                  to="/coach/clients"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View all →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No clients yet</h3>
                <p className="text-sm text-muted-foreground">
                  Approved clients will appear here
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {clients.slice(0, 8).map((c) => (
                  <Link
                    key={c.client_id}
                    to={`/coach/clients/${c.client_id}`}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {c.avatar_initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.full_name || c.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.goal || "No goal"}</p>
                    </div>
                    {getStatusBadge(c.daysSinceGym)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
