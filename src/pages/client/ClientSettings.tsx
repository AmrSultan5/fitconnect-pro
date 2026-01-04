import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Sun, Moon, Monitor } from "lucide-react";

export default function ClientSettings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    age: "",
    height_cm: "",
    weight_kg: "",
    goal_type: "",
    goal_notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const { data } = await supabase
      .from("client_profiles")
      .select("age, height_cm, weight_kg, goal")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      let goalType = "";
      let goalNotes = "";

      if (data.goal) {
        if (data.goal.includes("Goal Type:")) {
          const lines = data.goal.split("\n");
          const typeLine = lines.find((l: string) => l.startsWith("Goal Type:"));
          const notesLine = lines.find((l: string) => l.startsWith("Notes:"));
          if (typeLine) goalType = typeLine.replace("Goal Type:", "").trim();
          if (notesLine) goalNotes = notesLine.replace("Notes:", "").trim();
        } else {
          goalType = data.goal;
        }
      }

      setProfileData({
        age: data.age?.toString() || "",
        height_cm: data.height_cm?.toString() || "",
        weight_kg: data.weight_kg?.toString() || "",
        goal_type: goalType,
        goal_notes: goalNotes,
      });
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      let goalValue = "";
      if (profileData.goal_type) {
        goalValue = `Goal Type: ${profileData.goal_type}`;
        if (profileData.goal_notes) {
          goalValue += `\nNotes: ${profileData.goal_notes}`;
        }
      }

      const { error } = await supabase
        .from("client_profiles")
        .upsert({
          user_id: user.id,
          age: profileData.age ? parseInt(profileData.age) : null,
          height_cm: profileData.height_cm ? parseFloat(profileData.height_cm) : null,
          weight_kg: profileData.weight_kg ? parseFloat(profileData.weight_kg) : null,
          goal: goalValue || null,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information and fitness goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading profile...</div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      value={profileData.age}
                      onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      placeholder="Enter your age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="50"
                      max="250"
                      step="0.1"
                      value={profileData.height_cm}
                      onChange={(e) => setProfileData({ ...profileData, height_cm: e.target.value })}
                      placeholder="e.g., 180"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      value={profileData.weight_kg}
                      onChange={(e) => setProfileData({ ...profileData, weight_kg: e.target.value })}
                      placeholder="e.g., 75"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal_type">Fitness Goal</Label>
                    <Select
                      value={profileData.goal_type}
                      onValueChange={(value) => setProfileData({ ...profileData, goal_type: value })}
                    >
                      <SelectTrigger id="goal_type">
                        <SelectValue placeholder="Select your goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fat Loss">Fat Loss</SelectItem>
                        <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal_notes">Goal Notes (Optional)</Label>
                    <Textarea
                      id="goal_notes"
                      value={profileData.goal_notes}
                      onChange={(e) => setProfileData({ ...profileData, goal_notes: e.target.value })}
                      placeholder="Add any additional details about your fitness goals..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-sm">Light</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-sm">Dark</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-sm">System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
