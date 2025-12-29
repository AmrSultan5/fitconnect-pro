import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Utensils, Plus, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type DietPlan = Database["public"]["Tables"]["diet_plans"]["Row"];

interface DietPlanWithClient extends DietPlan {
  client_name: string | null;
  client_email: string | null;
}

export default function DietPlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<DietPlanWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: plansData, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching diet plans:", error);
    } else if (plansData) {
      // Fetch client names
      const plansWithClient = await Promise.all(
        plansData.map(async (plan) => {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", plan.client_id)
            .maybeSingle();

          return {
            ...plan,
            client_name: clientProfile?.full_name || null,
            client_email: clientProfile?.email || null,
          };
        })
      );
      setPlans(plansWithClient);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user, fetchPlans]);

  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Diet Plans</h1>
            <p className="text-muted-foreground">Create and manage nutrition plans for your clients</p>
          </div>
          <Button asChild>
            <Link to="/coach/diets/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Utensils className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-muted-foreground">No diet plans yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first diet plan to get started
                </p>
                <Button asChild className="mt-4">
                  <Link to="/coach/diets/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Plans */}
            {activePlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Plans</CardTitle>
                  <CardDescription>Currently assigned diet plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{plan.title}</h4>
                            <Badge variant="default">Active</Badge>
                            <Badge variant={plan.plan_type === "pdf" ? "secondary" : "outline"}>
                              {plan.plan_type === "pdf" ? "PDF" : "Structured"}
                            </Badge>
                            {plan.version && (
                              <span className="text-sm text-muted-foreground">v{plan.version}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {plan.client_name || plan.client_email || "Unknown client"}
                            </div>
                            <span>Created: {format(parseISO(plan.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/coach/clients/${plan.client_id}`}>View Client</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inactive Plans */}
            {inactivePlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Plans</CardTitle>
                  <CardDescription>Complete history of diet plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inactivePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{plan.title}</h4>
                            <Badge variant="secondary">Inactive</Badge>
                            <Badge variant={plan.plan_type === "pdf" ? "secondary" : "outline"}>
                              {plan.plan_type === "pdf" ? "PDF" : "Structured"}
                            </Badge>
                            {plan.version && (
                              <span className="text-sm text-muted-foreground">v{plan.version}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {plan.client_name || plan.client_email || "Unknown client"}
                            </div>
                            <span>Created: {format(parseISO(plan.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/coach/clients/${plan.client_id}`}>View Client</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

