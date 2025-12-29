import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import {
  User,
  Calendar,
  CheckCircle2,
  Moon,
  XCircle,
  Flame,
  ClipboardList,
  Utensils,
  FileText,
  Download,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AttendanceStatus = "trained" | "rest" | "missed";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
}

type CoachNote = Database["public"]["Tables"]["coach_notes"]["Row"];

interface ClientProfile {
  full_name: string | null;
  email: string;
  goal: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
}

type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];
type DietPlan = Database["public"]["Tables"]["diet_plans"]["Row"];

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [attendanceStats, setAttendanceStats] = useState({ trained: 0, rest: 0, missed: 0, streak: 0 });
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!clientId || !user) return;

    // Fetch active workout plan
    const { data: workoutData } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("client_id", clientId)
      .eq("coach_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (workoutData) {
      setWorkoutPlan(workoutData);
    }

    // Fetch active diet plan
    const { data: dietData } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("client_id", clientId)
      .eq("coach_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (dietData) {
      setDietPlan(dietData);
    }
  }, [clientId, user]);

  const fetchCoachNotes = useCallback(async () => {
    if (!clientId || !user) return;

    const { data: notesData } = await supabase
      .from("coach_notes")
      .select("*")
      .eq("client_id", clientId)
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    if (notesData) {
      setCoachNotes(notesData);
    }
  }, [clientId, user]);

  const fetchAttendance = useCallback(async () => {
    if (!clientId) return;

    const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("id, date, status, notes")
      .eq("user_id", clientId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });

    if (attendanceData) {
      setAttendance(attendanceData as AttendanceRecord[]);

      // Calculate stats
      const stats = { trained: 0, rest: 0, missed: 0, streak: 0 };
      attendanceData.forEach((a) => {
        if (a.status === "trained") stats.trained++;
        else if (a.status === "rest") stats.rest++;
        else stats.missed++;
      });

      // Calculate streak
      const sortedRecords = [...attendanceData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let currentStreak = 0;
      for (const record of sortedRecords) {
        if (record.status === "trained" || record.status === "rest") {
          currentStreak++;
        } else {
          break;
        }
      }
      stats.streak = currentStreak;

      setAttendanceStats(stats);
    }
  }, [clientId, selectedMonth]);

  // Check access and fetch data
  const checkAccessAndFetchData = useCallback(async () => {
    if (!user || !clientId) return;
    setIsLoading(true);

    // Check if coach has access to this client
    const { data: assignment } = await supabase
      .from("coach_client_assignments")
      .select("coach_id, client_id, is_active")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    setHasAccess(true);

    // Fetch client profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", clientId)
      .maybeSingle();

    const { data: clientProfileData } = await supabase
      .from("client_profiles")
      .select("goal, age, height_cm, weight_kg")
      .eq("user_id", clientId)
      .maybeSingle();

    if (profile) {
      setClientProfile({
        full_name: profile.full_name,
        email: profile.email,
        goal: clientProfileData?.goal || null,
        age: clientProfileData?.age || null,
        height_cm: clientProfileData?.height_cm || null,
        weight_kg: clientProfileData?.weight_kg || null,
      });
    }

    // Fetch attendance
    await fetchAttendance();

    // Fetch plans
    await fetchPlans();

    // Fetch coach notes
    await fetchCoachNotes();

    setIsLoading(false);
  }, [user, clientId, fetchAttendance, fetchPlans, fetchCoachNotes]);

  useEffect(() => {
    if (user && clientId) {
      checkAccessAndFetchData();
    }
  }, [user, clientId, checkAccessAndFetchData]);

  useEffect(() => {
    if (hasAccess) {
      fetchAttendance();
    }
  }, [hasAccess, fetchAttendance]);

  const openNewNoteDialog = () => {
    setEditingNote(null);
    setNoteContent("");
    setIsNotesDialogOpen(true);
  };

  const openEditNoteDialog = (note: CoachNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setIsNotesDialogOpen(true);
  };

  const saveNote = async () => {
    if (!user || !clientId || !noteContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Note content cannot be empty",
      });
      return;
    }

    setIsSavingNote(true);

    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from("coach_notes")
          .update({ content: noteContent.trim() })
          .eq("id", editingNote.id)
          .eq("coach_id", user.id);

        if (error) throw error;
        toast({ title: "Note updated" });
      } else {
        // Create new note
        const { error } = await supabase.from("coach_notes").insert({
          coach_id: user.id,
          client_id: clientId,
          content: noteContent.trim(),
        });

        if (error) throw error;
        toast({ title: "Note added" });
      }

      setIsNotesDialogOpen(false);
      setNoteContent("");
      setEditingNote(null);
      await fetchCoachNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save note",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error } = await supabase
        .from("coach_notes")
        .delete()
        .eq("id", noteId)
        .eq("coach_id", user.id);

      if (error) throw error;
      toast({ title: "Note deleted" });
      await fetchCoachNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete note",
      });
    }
  };

  const changeMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedMonth);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  const getStatusForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return attendance.find((a) => a.date === dayStr)?.status;
  };

  // Access denied
  if (hasAccess === false) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You don't have access to view this client's details.
              </p>
              <Button asChild>
                <Link to="/coach">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Loading
  if (isLoading || hasAccess === null) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/coach">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">
              {clientProfile?.full_name || clientProfile?.email || "Client Details"}
            </h1>
            <p className="text-muted-foreground">Client overview and management</p>
          </div>
        </div>

        {/* Client Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{clientProfile?.full_name || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{clientProfile?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="font-medium">{clientProfile?.goal || "Not set"}</p>
              </div>
              {clientProfile?.age && (
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium">{clientProfile.age} years</p>
                </div>
              )}
              {clientProfile?.height_cm && (
                <div>
                  <p className="text-sm text-muted-foreground">Height</p>
                  <p className="font-medium">{clientProfile.height_cm} cm</p>
                </div>
              )}
              {clientProfile?.weight_kg && (
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{clientProfile.weight_kg} kg</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
            <CardDescription>Read-only view of client attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-success/10 p-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trained</p>
                  <p className="text-2xl font-bold">{attendanceStats.trained}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-secondary/10 p-3">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rest Days</p>
                  <p className="text-2xl font-bold">{attendanceStats.rest}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-destructive/10 p-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Missed</p>
                  <p className="text-2xl font-bold">{attendanceStats.missed}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="rounded-lg bg-warning/10 p-3">
                  <Flame className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{attendanceStats.streak} days</p>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{format(selectedMonth, "MMMM yyyy")}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeMonth("prev")}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-secondary"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setSelectedMonth(new Date())}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-secondary"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => changeMonth("next")}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-secondary"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="py-2 font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
                {Array.from({ length: startOfMonth(selectedMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map((day) => {
                  const status = getStatusForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm ${
                        isToday ? "ring-2 ring-primary" : ""
                      } ${
                        status === "trained"
                          ? "bg-success text-success-foreground"
                          : status === "rest"
                          ? "bg-secondary"
                          : status === "missed"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted/50"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Plans */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Workout Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workoutPlan ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">{workoutPlan.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={workoutPlan.plan_type === "pdf" ? "secondary" : "default"}>
                        {workoutPlan.plan_type === "pdf" ? "PDF" : "Structured"}
                      </Badge>
                      {workoutPlan.version && <span className="text-sm text-muted-foreground">v{workoutPlan.version}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Created: {format(parseISO(workoutPlan.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/coach/workouts`}>
                      View Workout Plan
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p>No active workout plan</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Diet Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dietPlan ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">{dietPlan.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={dietPlan.plan_type === "pdf" ? "secondary" : "default"}>
                        {dietPlan.plan_type === "pdf" ? "PDF" : "Structured"}
                      </Badge>
                      {dietPlan.version && <span className="text-sm text-muted-foreground">v{dietPlan.version}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Created: {format(parseISO(dietPlan.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/coach/diets`}>
                      View Diet Plan
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p>No active diet plan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coach Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Coach Notes
                </CardTitle>
                <CardDescription>Private notes visible only to you</CardDescription>
              </div>
              <Button onClick={openNewNoteDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {coachNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>No notes yet</p>
                <p className="text-sm mt-2">Add your first note to track important information</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coachNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                          {note.updated_at !== note.created_at && (
                            <span> • Updated {format(parseISO(note.updated_at), "MMM d, yyyy")}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditNoteDialog(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Dialog */}
        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit Note" : "Add Note"}</DialogTitle>
              <DialogDescription>
                Add a private note about this client. Only you can see this note.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your note here..."
              className="min-h-[120px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveNote} disabled={isSavingNote || !noteContent.trim()}>
                {isSavingNote ? "Saving..." : editingNote ? "Update" : "Add"} Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

