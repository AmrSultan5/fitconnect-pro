import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Upload, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Json = Database["public"]["Tables"]["workout_plans"]["Row"]["structured_data"];

type PlanType = Database["public"]["Enums"]["plan_type"];

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

interface DayPlan {
  day: string;
  exercises: Exercise[];
}

interface Client {
  id: string;
  full_name: string | null;
  email: string;
}

export default function CreateWorkoutPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [planType, setPlanType] = useState<PlanType>("structured");
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [days, setDays] = useState<DayPlan[]>([
    { day: "Day 1", exercises: [{ name: "", sets: "", reps: "", rest: "" }] },
  ]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setIsLoadingClients(true);

    const { data: assignments } = await supabase
      .from("coach_client_assignments")
      .select("client_id")
      .eq("coach_id", user.id)
      .eq("is_active", true);

    if (assignments) {
      const clientsData = await Promise.all(
        assignments.map(async (a) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", a.client_id)
            .maybeSingle();

          return {
            id: a.client_id,
            full_name: profile?.full_name || null,
            email: profile?.email || "",
          };
        })
      );
      setClients(clientsData);
      if (clientsData.length > 0) {
        setSelectedClientId(clientsData[0].id);
      }
    }
    setIsLoadingClients(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, fetchClients]);

  const addDay = () => {
    setDays([...days, { day: `Day ${days.length + 1}`, exercises: [{ name: "", sets: "", reps: "", rest: "" }] }]);
  };

  const removeDay = (dayIndex: number) => {
    if (days.length > 1) {
      setDays(days.filter((_, i) => i !== dayIndex));
    }
  };

  const updateDay = (dayIndex: number, field: keyof DayPlan, value: string) => {
    const updatedDays = [...days];
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], [field]: value };
    setDays(updatedDays);
  };

  const addExercise = (dayIndex: number) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].exercises.push({ name: "", sets: "", reps: "", rest: "" });
    setDays(updatedDays);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const updatedDays = [...days];
    if (updatedDays[dayIndex].exercises.length > 1) {
      updatedDays[dayIndex].exercises = updatedDays[dayIndex].exercises.filter(
        (_, i) => i !== exerciseIndex
      );
      setDays(updatedDays);
    }
  };

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: keyof Exercise,
    value: string
  ) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].exercises[exerciseIndex] = {
      ...updatedDays[dayIndex].exercises[exerciseIndex],
      [field]: value,
    };
    setDays(updatedDays);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "Please select a PDF file",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a PDF smaller than 10MB",
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedClientId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a client",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a plan title",
      });
      return;
    }

    if (planType === "structured") {
      // Validate structured plan
      const hasValidExercises = days.some(
        (day) => day.exercises.some((ex) => ex.name.trim() !== "")
      );
      if (!hasValidExercises) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please add at least one exercise",
        });
        return;
      }
    } else if (planType === "pdf") {
      if (!pdfFile) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please upload a PDF file",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      let pdfUrl: string | null = null;

      // Upload PDF if needed
      if (planType === "pdf" && pdfFile) {
        const fileExt = pdfFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("plan-pdfs")
          .upload(fileName, pdfFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from("plan-pdfs").getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }

      // Get next version number
      const { data: existingPlans } = await supabase
        .from("workout_plans")
        .select("version")
        .eq("coach_id", user.id)
        .eq("client_id", selectedClientId)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = existingPlans && existingPlans.length > 0 && existingPlans[0].version
        ? existingPlans[0].version + 1
        : 1;

      // Deactivate previous active plan
      await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("coach_id", user.id)
        .eq("client_id", selectedClientId)
        .eq("is_active", true);

      // Create new plan
      const planData: {
        coach_id: string;
        client_id: string;
        title: string;
        plan_type: PlanType;
        version: number;
        is_active: boolean;
        structured_data?: Json;
        pdf_url?: string | null;
      } = {
        coach_id: user.id,
        client_id: selectedClientId,
        title: title.trim(),
        plan_type: planType,
        version: nextVersion,
        is_active: true,
      };

      if (planType === "structured") {
        planData.structured_data = days as unknown as Json;
      } else {
        planData.pdf_url = pdfUrl;
      }

      const { error: insertError } = await supabase.from("workout_plans").insert(planData);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Workout plan created successfully",
      });

      navigate("/coach/workouts");
    } catch (error) {
      console.error("Error creating workout plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create workout plan";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/coach/workouts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plans
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Create Workout Plan</h1>
          <p className="text-muted-foreground">Create a new workout plan for a client</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>Basic information about the workout plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              {isLoadingClients ? (
                <p className="text-sm text-muted-foreground">Loading clients...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clients available</p>
              ) : (
                <select
                  id="client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name || client.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Beginner Strength Program"
              />
            </div>

            <div className="space-y-2">
              <Label>Plan Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="structured"
                    checked={planType === "structured"}
                    onChange={(e) => setPlanType(e.target.value as PlanType)}
                  />
                  Structured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="pdf"
                    checked={planType === "pdf"}
                    onChange={(e) => setPlanType(e.target.value as PlanType)}
                  />
                  PDF Upload
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {planType === "structured" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Structured Plan</CardTitle>
                  <CardDescription>Define exercises for each day</CardDescription>
                </div>
                <Button onClick={addDay} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Day
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {days.map((day, dayIndex) => (
                <div key={dayIndex} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Input
                      value={day.day}
                      onChange={(e) => updateDay(dayIndex, "day", e.target.value)}
                      className="max-w-[200px]"
                      placeholder="Day name"
                    />
                    {days.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDay(dayIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div key={exerciseIndex} className="grid gap-3 sm:grid-cols-4">
                        <Input
                          placeholder="Exercise name"
                          value={exercise.name}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, "name", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Sets"
                          value={exercise.sets}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, "sets", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Reps"
                          value={exercise.reps}
                          onChange={(e) =>
                            updateExercise(dayIndex, exerciseIndex, "reps", e.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Rest (sec)"
                            value={exercise.rest}
                            onChange={(e) =>
                              updateExercise(dayIndex, exerciseIndex, "rest", e.target.value)
                            }
                            className="flex-1"
                          />
                          {day.exercises.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExercise(dayIndex, exerciseIndex)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addExercise(dayIndex)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exercise
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>PDF Upload</CardTitle>
              <CardDescription>Upload a PDF file containing the workout plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">Select PDF File</Label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 mt-2"
                />
                {pdfFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/coach/workouts">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

