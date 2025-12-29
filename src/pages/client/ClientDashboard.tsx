import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  CheckCircle2, 
  Moon, 
  XCircle, 
  TrendingUp, 
  Flame,
  ClipboardList,
  Utensils,
  User
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Link } from "react-router-dom";

type AttendanceStatus = "trained" | "rest" | "missed";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayStatus, setTodayStatus] = useState<AttendanceStatus | null>(null);
  const [streak, setStreak] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({ trained: 0, rest: 0, missed: 0 });
  const [goal, setGoal] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("id, date, status")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });

    if (attendanceData) {
      setAttendance(attendanceData as AttendanceRecord[]);
      const todayRecord = attendanceData.find(a => a.date === todayStr);
      setTodayStatus(todayRecord?.status as AttendanceStatus || null);

      const stats = { trained: 0, rest: 0, missed: 0 };
      attendanceData.forEach(a => {
        if (a.status === "trained") stats.trained++;
        else if (a.status === "rest") stats.rest++;
        else stats.missed++;
      });
      setMonthlyStats(stats);
      calculateStreak(attendanceData as AttendanceRecord[]);
    }

    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("goal")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileData) setGoal(profileData.goal);

    const { data: assignment } = await supabase
      .from("coach_client_assignments")
      .select("coach_id")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (assignment) {
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", assignment.coach_id)
        .maybeSingle();
      if (coachProfile) setCoachName(coachProfile.full_name);
    }
  };

  const calculateStreak = (records: AttendanceRecord[]) => {
    let currentStreak = 0;
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const record of sortedRecords) {
      if (record.status === "trained" || record.status === "rest") currentStreak++;
      else break;
    }
    setStreak(currentStreak);
  };

  const logAttendance = async (status: AttendanceStatus) => {
    if (!user) return;
    setIsLoading(true);
    const { error } = await supabase
      .from("attendance")
      .upsert({ user_id: user.id, date: todayStr, status }, { onConflict: "user_id,date" });
    setIsLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log attendance." });
    } else {
      setTodayStatus(status);
      toast({ title: "Attendance logged", description: status === "trained" ? "Great job!" : status === "rest" ? "Rest day logged." : "Tomorrow is a new day!" });
      fetchData();
    }
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const getStatusForDay = (day: Date) => attendance.find(a => a.date === format(day, "yyyy-MM-dd"))?.status;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Did you go to the gym today?</CardTitle>
            <CardDescription>{todayStatus ? `Logged: ${todayStatus}` : "Log your attendance"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => logAttendance("trained")} disabled={isLoading} variant={todayStatus === "trained" ? "default" : "outline"} className="flex-1 min-w-[120px]"><CheckCircle2 className="mr-2 h-4 w-4" />Trained</Button>
              <Button onClick={() => logAttendance("rest")} disabled={isLoading} variant={todayStatus === "rest" ? "secondary" : "outline"} className="flex-1 min-w-[120px]"><Moon className="mr-2 h-4 w-4" />Rest Day</Button>
              <Button onClick={() => logAttendance("missed")} disabled={isLoading} variant={todayStatus === "missed" ? "destructive" : "outline"} className="flex-1 min-w-[120px]"><XCircle className="mr-2 h-4 w-4" />Missed</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-success/10 p-3"><TrendingUp className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">{monthlyStats.trained} days</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-warning/10 p-3"><Flame className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Streak</p><p className="text-2xl font-bold">{streak} days</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><Link to="/client/workouts" className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Workout</p><p className="text-sm font-medium text-primary">View →</p></div></Link></CardContent></Card>
          <Card><CardContent className="pt-6"><Link to="/client/diets" className="flex items-center gap-4"><div className="rounded-lg bg-accent/10 p-3"><Utensils className="h-5 w-5 text-accent" /></div><div><p className="text-sm text-muted-foreground">Diet</p><p className="text-sm font-medium text-primary">View →</p></div></Link></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{format(today, "MMMM yyyy")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="py-2 font-medium text-muted-foreground">{d}</div>)}
                {Array.from({length:startOfMonth(today).getDay()}).map((_,i)=><div key={`e-${i}`}/>)}
                {daysInMonth.map(day=>{const s=getStatusForDay(day);const isT=isSameDay(day,today);return<div key={day.toISOString()} className={`aspect-square flex items-center justify-center rounded-md text-sm ${isT?"ring-2 ring-primary":""} ${s==="trained"?"bg-success text-success-foreground":s==="rest"?"bg-secondary":s==="missed"?"bg-destructive text-destructive-foreground":"bg-muted/50"}`}>{format(day,"d")}</div>})}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Your Journey</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {coachName ? <div className="flex items-center gap-4 rounded-lg bg-secondary/50 p-4"><User className="h-5 w-5"/><div><p className="text-sm text-muted-foreground">Coach</p><p className="font-medium">{coachName}</p></div></div> : <Link to="/coaches" className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 hover:border-primary"><User className="h-5 w-5 text-muted-foreground"/><div><p className="font-medium">Find a Coach</p></div></Link>}
              {goal && <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Goal</p><p className="font-medium">{goal}</p></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
