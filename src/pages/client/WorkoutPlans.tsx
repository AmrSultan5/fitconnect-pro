import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ClipboardList, FileText, Download, Calendar } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];

interface WorkoutPlanWithCoach extends WorkoutPlan {
  coach_name: string | null;
}

interface Exercise {
  name?: string;
  sets?: number | string;
  reps?: number | string;
  rest?: string;
}

interface DayPlan {
  day?: string;
  exercises?: Exercise[];
}

type StructuredData = DayPlan[] | Record<string, unknown> | null;

export default function WorkoutPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlanWithCoach[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: plansData, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workout plans:", error);
    } else if (plansData) {
      // Fetch coach names
      const plansWithCoach = await Promise.all(
        plansData.map(async (plan) => {
          const { data: coachProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", plan.coach_id)
            .maybeSingle();

          return {
            ...plan,
            coach_name: coachProfile?.full_name || null,
          };
        })
      );
      setPlans(plansWithCoach);
    }
    setIsLoading(false);
  }, [user]);

  const handleViewPdf = async (pdfPath: string) => {
    console.log("PDF PATH USED:", pdfPath);
  
    const { data, error } = await supabase.storage
      .from("plan-pdfs")
      .createSignedUrl(pdfPath, 60); // 60 seconds
  
    if (error) {
      console.error("Failed to create signed URL:", error);
      return;
    }
  
    window.open(data.signedUrl, "_blank");
  };
  

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user, fetchPlans]);

  const activePlan = plans.find((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  const renderStructuredPlan = (structuredData: StructuredData) => {
    if (!structuredData || typeof structuredData !== "object") {
      return <p className="text-sm text-muted-foreground">No structured data available</p>;
    }

    // Handle different possible structures
    if (Array.isArray(structuredData)) {
      return (
        <div className="space-y-4">
          {structuredData.map((day: DayPlan, idx: number) => (
            <div key={idx} className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">{day.day || `Day ${idx + 1}`}</h4>
              {day.exercises && Array.isArray(day.exercises) && (
                <div className="space-y-2">
                  {day.exercises.map((exercise: Exercise, exIdx: number) => (
                    <div key={exIdx} className="text-sm">
                      <p className="font-medium">{exercise.name || "Exercise"}</p>
                      {exercise.sets && <p className="text-muted-foreground">Sets: {exercise.sets}</p>}
                      {exercise.reps && <p className="text-muted-foreground">Reps: {exercise.reps}</p>}
                      {exercise.rest && <p className="text-muted-foreground">Rest: {exercise.rest}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle object structure
    return (
      <div className="space-y-2">
        {Object.entries(structuredData).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium">{key}:</span>{" "}
            <span className="text-muted-foreground">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Workout Plans</h1>
          <p className="text-muted-foreground">View your assigned workout plans</p>
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
                <ClipboardList className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-muted-foreground">No workout plans assigned yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your coach will assign a plan when you're ready
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Plan */}
            {activePlan && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        {activePlan.title}
                      </CardTitle>
                      <CardDescription>
                        {activePlan.coach_name && `By ${activePlan.coach_name}`}
                        {activePlan.version && ` • Version ${activePlan.version}`}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created: {format(parseISO(activePlan.created_at), "MMM d, yyyy")}
                    </div>
                    {activePlan.updated_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Updated: {format(parseISO(activePlan.updated_at), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>

                  {activePlan.plan_type === "pdf" && activePlan.pdf_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        PDF Plan
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleViewPdf(activePlan.pdf_url!)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="h-4 w-4" />
                        Structured Plan
                      </div>
                      {renderStructuredPlan(activePlan.structured_data as StructuredData)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Inactive Plans */}
            {inactivePlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Previous Plans</CardTitle>
                  <CardDescription>Your workout plan history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inactivePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{plan.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {plan.coach_name && `By ${plan.coach_name}`}
                              {plan.version && ` • Version ${plan.version}`}
                            </p>
                          </div>
                          <Badge variant="secondary">Inactive</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>Created: {format(parseISO(plan.created_at), "MMM d, yyyy")}</span>
                          {plan.updated_at && (
                            <span>Updated: {format(parseISO(plan.updated_at), "MMM d, yyyy")}</span>
                          )}
                        </div>
                        {plan.plan_type === "pdf" && plan.pdf_url && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPdf(plan.pdf_url!)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              View PDF
                            </Button>
                          </div>
                        )}
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

