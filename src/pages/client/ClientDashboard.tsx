import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  User,
  MessageSquare,
  ArrowRight,
  UserCircle,
  Target
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type AttendanceStatus = "trained" | "rest" | "missed";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
}

function StreakRing({
  value,
  maxDays,
}: {
  value: number;
  maxDays: number;
}) {
  const percentage = maxDays > 0 ? Math.min((value / maxDays) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 58; // r=58 for a 144px container
  const strokeDashoffset = percentage > 0 ? circumference - (circumference * percentage) / 100 : circumference;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
        {/* Background track */}
        <circle
          cx="72"
          cy="72"
          r="58"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          className="opacity-60"
        />
        {/* Progress ring - only render stroke when > 0% */}
        <circle
          cx="72"
          cy="72"
          r="58"
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{ opacity: percentage > 0 ? 1 : 0 }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight text-foreground">
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-muted-foreground font-medium mt-1">
          Month Progress
        </span>
      </div>
    </div>
  );
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
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachSpecialties, setCoachSpecialties] = useState<string[] | null>(null);
  const [coachAvatarUrl, setCoachAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [completedDays, setCompletedDays] = useState(0);
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const daysInCurrentMonth = useMemo(() => {
    return endOfMonth(today).getDate();
  }, [today]);  
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);  

  const fetchCoachData = useCallback(async () => {
    if (!user) return;
  
    setIsLoadingCoach(true);
    try {
      const { data: assignment, error } = await supabase
        .from("coach_client_assignments")
        .select("coach_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
  
      if (error) throw error;
  
      if (assignment) {
        setCoachId(assignment.coach_id);
  
        const { data: coachProfile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", assignment.coach_id)
          .maybeSingle();
  
        if (profileError) throw profileError;
  
        if (coachProfile) {
          setCoachName(coachProfile.full_name);
          setCoachAvatarUrl(coachProfile.avatar_url);
        }
  
        const { data: coachData, error: coachError } = await supabase
          .from("coach_profiles")
          .select("specialties")
          .eq("user_id", assignment.coach_id)
          .maybeSingle();
  
        if (coachError) throw coachError;
  
        if (coachData) {
          setCoachSpecialties(coachData.specialties);
        }
      } else {
        setCoachId(null);
        setCoachName(null);
        setCoachSpecialties(null);
        setCoachAvatarUrl(null);
      }
    } catch (err) {
      console.error("fetchCoachData failed:", err);
    } finally {
      setIsLoadingCoach(false);
    }
  }, [user]);  

  const fetchGoalData = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("client_profiles")
      .select("goal")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.goal) {
      // Parse goal type from stored format
      if (data.goal.includes("Goal Type:")) {
        const typeLine = data.goal.split("\n").find((l: string) => l.startsWith("Goal Type:"));
        if (typeLine) {
          setGoal(typeLine.replace("Goal Type:", "").trim());
        }
      } else {
        setGoal(data.goal);
      }
    }
  }, [user]);

  const fetchData = useCallback(async () => {
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

      const calculateCompletedDaysThisMonth = (records: AttendanceRecord[]) => {
        return records.filter(
          r => r.status === "trained" || r.status === "rest"
        ).length;
      }; 

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
      setCompletedDays(
        calculateCompletedDaysThisMonth(attendanceData as AttendanceRecord[])
      );     
    }
  }, [user, todayStr, today]);

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

  const handleChangeCoach = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("coach_client_assignments")
        .update({ is_active: false })
        .eq("client_id", user.id)
        .eq("is_active", true);

      if (error) {
        throw error;
      }

      setCoachId(null);
      setCoachName(null);
      setCoachSpecialties(null);
      setCoachAvatarUrl(null);

      toast({
        title: "Coach removed",
        description: "You can now select a new coach from the marketplace.",
      });

      navigate("/coaches");
    } catch (error) {
      console.error("Error changing coach:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change coach. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const getStatusForDay = (day: Date) => attendance.find(a => a.date === format(day, "yyyy-MM-dd"))?.status;

  useEffect(() => {
    if (user) fetchCoachData();
  }, [user, fetchCoachData]);

  useEffect(() => {
    if (user) fetchGoalData();
  }, [user, fetchGoalData]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]); 

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Did you go to the gym today?</CardTitle>
            <CardDescription>{todayStatus ? `Logged: ${todayStatus}` : "Log your attendance"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => logAttendance("trained")} disabled={isLoading} variant={todayStatus === "trained" ? "default" : "outline"} className="flex-1 min-w-[120px] shadow-sm hover:shadow-md transition"><CheckCircle2 className="mr-2 h-4 w-4" />Trained</Button>
              <Button onClick={() => logAttendance("rest")} disabled={isLoading} variant={todayStatus === "rest" ? "secondary" : "outline"} className="flex-1 min-w-[120px] shadow-sm hover:shadow-md transition"><Moon className="mr-2 h-4 w-4" />Rest Day</Button>
              <Button onClick={() => logAttendance("missed")} disabled={isLoading} variant={todayStatus === "missed" ? "destructive" : "outline"} className="flex-1 min-w-[120px] shadow-sm hover:shadow-md transition"><XCircle className="mr-2 h-4 w-4" />Missed</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-500/20 p-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Training Days</p>
              <p className="text-3xl font-bold">{monthlyStats.trained}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-orange-500/20 p-3">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-3xl font-bold">{streak} 🔥</p>
            </div>
          </div>
        </CardContent>
      </Card>
          <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20"><CardContent className="pt-6"><Link to="/client/workouts" className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Workout</p><p className="text-sm font-medium text-primary">View →</p></div></Link></CardContent></Card>
          <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20"><CardContent className="pt-6"><Link to="/client/diets" className="flex items-center gap-4"><div className="rounded-lg bg-accent/10 p-3"><Utensils className="h-5 w-5 text-accent" /></div><div><p className="text-sm text-muted-foreground">Diet</p><p className="text-sm font-medium text-primary">View →</p></div></Link></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
            <CardHeader><CardTitle>{format(today, "MMMM yyyy")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="py-2 font-medium text-muted-foreground">{d}</div>)}
                {Array.from({length:startOfMonth(today).getDay()}).map((_,i)=><div key={`e-${i}`}/>)}
                {daysInMonth.map(day=>{const s=getStatusForDay(day);const isT=isSameDay(day,today);return<div key={day.toISOString()} className={`aspect-square flex items-center justify-center rounded-md text-sm ${isT?"ring-2 ring-primary":""} ${s==="trained"?"bg-success text-success-foreground":s==="rest"?"bg-secondary":s==="missed"?"bg-destructive text-destructive-foreground":"bg-muted/50"}`}>{format(day,"d")}</div>})}
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Your Journey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="flex items-center justify-center py-4">
                <StreakRing value={completedDays} maxDays={daysInCurrentMonth} />
              </div>

              {goal && (
                <div className="rounded-2xl bg-muted/40 backdrop-blur-sm p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Goal</p>
                  </div>
                  <p className="font-semibold text-base text-foreground">{goal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Your Coach Section */}
        {isLoadingCoach ? (
          <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">Loading coach information...</div>
            </CardContent>
          </Card>
        ) : coachId ? (
          <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/30 shadow-md">
            <CardHeader>
            <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
                <UserCircle className="h-5 w-5" />
                Your Coach
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 text-center sm:text-left">
            <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg">
                  <AvatarImage src={coachAvatarUrl || undefined} alt={coachName || "Coach"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {coachName?.split(" ").map(n => n[0]).join("").toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div>
                  <p className="font-bold text-xl tracking-tight">
                    {coachName || "Your Coach"}
                  </p>
                    {coachSpecialties && coachSpecialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                        {coachSpecialties.slice(0, 3).map((specialty, idx) => (
                          <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-3">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/coaches/${coachId}`)}
                      className="w-full sm:flex-1"
                    >
                      View Coach Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/client/coach")}
                      className="w-full sm:flex-1"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={isLoading}>
                        Change Coach
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Change Coach?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your current coach and you'll need to select a new one.
                          You will lose access to the current coach chat.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleChangeCoach}>
                          Yes, change coach
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/30 shadow-md">
            <CardHeader>
            <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
                <User className="h-5 w-5" />
                Find a Coach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/coaches" className="flex items-center gap-4 rounded-lg border-2 border-dashed p-4 hover:border-primary transition-colors">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Find a Coach</p>
                  <p className="text-sm text-muted-foreground">Browse certified coaches to get started</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
