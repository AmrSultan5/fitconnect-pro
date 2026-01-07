import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Calendar, CheckCircle2, Moon, XCircle, TrendingUp, Flame } from "lucide-react";

type AttendanceStatus = "trained" | "rest" | "missed";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
}

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ trained: 0, rest: 0, missed: 0, streak: 0 });

  const fetchAttendance = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

    const { data: attendanceData, error } = await supabase
      .from("attendance")
      .select("id, date, status, notes")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching attendance:", error);
    } else if (attendanceData) {
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
      
      setStats(stats);
    }
    setIsLoading(false);
  }, [user, selectedMonth]);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, selectedMonth, fetchAttendance]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  const getStatusForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return attendance.find((a) => a.date === dayStr)?.status;
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case "trained":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "rest":
        return <Moon className="h-4 w-4 text-muted-foreground" />;
      case "missed":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadgeVariant = (status: AttendanceStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "trained":
        return "default";
      case "rest":
        return "secondary";
      case "missed":
        return "destructive";
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground">Track your gym attendance over time</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Trained */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Days</p>
                <p className="text-3xl font-bold">{stats.trained}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rest */}
        <Card className="bg-gradient-to-br from-muted/40 to-muted/10 border-border/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted p-3">
                <Moon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rest Days</p>
                <p className="text-3xl font-bold">{stats.rest}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missed */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-500/20 p-3">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missed</p>
                <p className="text-3xl font-bold">{stats.missed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-500/20 p-3">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold">{stats.streak} 🔥</p>
              </div>
            </div>
          </CardContent>
        </Card>

        </div>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(selectedMonth, "MMMM yyyy")}
                </CardTitle>
                <CardDescription>Click on a day to view details</CardDescription>
              </div>
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Your latest attendance entries</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>No attendance records for this month</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendance.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{format(parseISO(record.date), "EEEE, MMMM d, yyyy")}</p>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}