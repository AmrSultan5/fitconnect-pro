import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Upload, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Json = Database["public"]["Tables"]["diet_plans"]["Row"]["structured_data"];

type PlanType = Database["public"]["Enums"]["plan_type"];

interface Food {
  name: string;
  amount: string;
  calories: string;
}

interface Meal {
  meal: string;
  foods: Food[];
  description: string;
}

interface Client {
  id: string;
  full_name: string | null;
  email: string;
}

export default function CreateDietPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [planType, setPlanType] = useState<PlanType>("structured");
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [meals, setMeals] = useState<Meal[]>([
    { meal: "Breakfast", foods: [{ name: "", amount: "", calories: "" }], description: "" },
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

  const addMeal = () => {
    setMeals([
      ...meals,
      { meal: `Meal ${meals.length + 1}`, foods: [{ name: "", amount: "", calories: "" }], description: "" },
    ]);
  };

  const removeMeal = (mealIndex: number) => {
    if (meals.length > 1) {
      setMeals(meals.filter((_, i) => i !== mealIndex));
    }
  };

  const updateMeal = (mealIndex: number, field: keyof Meal, value: string) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], [field]: value };
    setMeals(updatedMeals);
  };

  const addFood = (mealIndex: number) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].foods.push({ name: "", amount: "", calories: "" });
    setMeals(updatedMeals);
  };

  const removeFood = (mealIndex: number, foodIndex: number) => {
    const updatedMeals = [...meals];
    if (updatedMeals[mealIndex].foods.length > 1) {
      updatedMeals[mealIndex].foods = updatedMeals[mealIndex].foods.filter(
        (_, i) => i !== foodIndex
      );
      setMeals(updatedMeals);
    }
  };

  const updateFood = (mealIndex: number, foodIndex: number, field: keyof Food, value: string) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].foods[foodIndex] = {
      ...updatedMeals[mealIndex].foods[foodIndex],
      [field]: value,
    };
    setMeals(updatedMeals);
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
      const hasValidFoods = meals.some((meal) => meal.foods.some((food) => food.name.trim() !== ""));
      if (!hasValidFoods) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please add at least one food item",
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
      // Get next version number (needed before PDF upload for folder structure)
      const { data: existingPlans } = await supabase
        .from("diet_plans")
        .select("version")
        .eq("coach_id", user.id)
        .eq("client_id", selectedClientId)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = existingPlans && existingPlans.length > 0 && existingPlans[0].version
        ? existingPlans[0].version + 1
        : 1;

      let pdfUrl: string | null = null;

      // Upload PDF if needed
      // Folder structure: plan-pdfs/{coachId}/{clientId}/{planType}/{version}/{filename}
      if (planType === "pdf" && pdfFile) {
        const fileExt = pdfFile.name.split(".").pop();
        const fileName = `${user.id}/${selectedClientId}/diet/${nextVersion}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("plan-pdfs")
          .upload(fileName, pdfFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // ✅ Store ONLY the storage path (NOT a public URL)
        pdfUrl = fileName;
      }

      // Deactivate previous active plan
      await supabase
        .from("diet_plans")
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
        planData.structured_data = meals as unknown as Json;
      } else {
        planData.pdf_url = pdfUrl;
      }

      const { error: insertError } = await supabase.from("diet_plans").insert(planData);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Diet plan created successfully",
      });

      navigate("/coach/diets");
    } catch (error) {
      console.error("Error creating diet plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create diet plan";
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
            <Link to="/coach/diets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plans
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Create Diet Plan</h1>
          <p className="text-muted-foreground">Create a new nutrition plan for a client</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>Basic information about the diet plan</CardDescription>
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
                placeholder="e.g., High Protein Meal Plan"
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
                  <CardDescription>Define meals and foods</CardDescription>
                </div>
                <Button onClick={addMeal} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Meal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Input
                      value={meal.meal}
                      onChange={(e) => updateMeal(mealIndex, "meal", e.target.value)}
                      className="max-w-[200px]"
                      placeholder="Meal name"
                    />
                    {meals.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMeal(mealIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {meal.foods.map((food, foodIndex) => (
                      <div key={foodIndex} className="grid gap-3 sm:grid-cols-3">
                        <Input
                          placeholder="Food name"
                          value={food.name}
                          onChange={(e) =>
                            updateFood(mealIndex, foodIndex, "name", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Amount"
                          value={food.amount}
                          onChange={(e) =>
                            updateFood(mealIndex, foodIndex, "amount", e.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Calories (optional)"
                            value={food.calories}
                            onChange={(e) =>
                              updateFood(mealIndex, foodIndex, "calories", e.target.value)
                            }
                            className="flex-1"
                          />
                          {meal.foods.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFood(mealIndex, foodIndex)}
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
                      onClick={() => addFood(mealIndex)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Food
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Description (Optional)</Label>
                    <textarea
                      value={meal.description}
                      onChange={(e) => updateMeal(mealIndex, "description", e.target.value)}
                      placeholder="Add any notes about this meal..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>PDF Upload</CardTitle>
              <CardDescription>Upload a PDF file containing the diet plan</CardDescription>
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
            <Link to="/coach/diets">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

