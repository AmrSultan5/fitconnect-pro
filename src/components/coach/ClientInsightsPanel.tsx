import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, differenceInDays, startOfMonth } from "date-fns";
import {
  Target,
  Calendar,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Scale,
  Activity,
} from "lucide-react";
import { InBodyMiniChart } from "@/components/inbody/InBodyMiniChart";
import type { InBodyRecord, InBodyInsights } from "@/hooks/useInBodyRecords";

interface ClientInsightsPanelProps {
  clientId: string;
  compact?: boolean;
}

interface InsightData {
  goal: string | null;
  startDate: string | null;
  currentStreak: number;
  consistencyScore: number;
  trainedDays: number;
  missedDays: number;
  restDays: number;
  totalLogged: number;
  bestDay: string | null;
  riskFlags: string[];
  lastTrainedDate: string | null;
  weightTrend: "up" | "down" | "stable" | null;
  fatTrend: "up" | "down" | "stable" | null;
  muscleTrend: "up" | "down" | "stable" | null;
}

export function ClientInsightsPanel({ clientId, compact = false }: ClientInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const [inbodyInsights, setInbodyInsights] = useState<InBodyInsights>({
    weightChange: null,
    muscleChange: null,
    fatChange: null,
    periodDays: 30,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, [clientId]);

  const fetchInsights = async () => {
    setIsLoading(true);

    // Fetch client profile for goal and start date
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("goal, created_at")
      .eq("user_id", clientId)
      .maybeSingle();

    // Fetch attendance for last 30 days
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const { data: attendance } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("user_id", clientId)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false });

    // Fetch InBody records for trends
    const { data: inbodyData } = await supabase
      .from("inbody_records")
      .select("*")
      .eq("user_id", clientId)
      .order("date", { ascending: true });

    const typedInbodyRecords: InBodyRecord[] = (inbodyData || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      date: r.date,
      weight_kg: Number(r.weight_kg),
      skeletal_muscle_kg: Number(r.skeletal_muscle_kg),
      body_fat_percentage: Number(r.body_fat_percentage),
      created_at: r.created_at,
    }));

    setInbodyRecords(typedInbodyRecords);

    // Calculate monthly insights for InBody
    const monthStart = startOfMonth(new Date());
    const monthRecords = typedInbodyRecords.filter((r) => new Date(r.date) >= monthStart);
    if (monthRecords.length >= 2) {
      const first = monthRecords[0];
      const last = monthRecords[monthRecords.length - 1];
      setInbodyInsights({
        weightChange: Math.round((last.weight_kg - first.weight_kg) * 10) / 10,
        muscleChange: Math.round((last.skeletal_muscle_kg - first.skeletal_muscle_kg) * 10) / 10,
        fatChange: Math.round((last.body_fat_percentage - first.body_fat_percentage) * 10) / 10,
        periodDays: differenceInDays(new Date(), monthStart),
      });
    }

    // Calculate insights
    const trainedDays = attendance?.filter((a) => a.status === "trained").length || 0;
    const missedDays = attendance?.filter((a) => a.status === "missed").length || 0;
    const restDays = attendance?.filter((a) => a.status === "rest").length || 0;
    const totalLogged = attendance?.length || 0;

    // Calculate consistency score (trained + rest) / total * 100
    const consistencyScore = totalLogged > 0 
      ? Math.round(((trainedDays + restDays) / Math.max(totalLogged, 14)) * 100)
      : 0;

    // Calculate current streak
    let currentStreak = 0;
    if (attendance) {
      const sortedAttendance = [...attendance].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      for (const record of sortedAttendance) {
        if (record.status === "trained" || record.status === "rest") {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Find best training day
    const dayCount: Record<string, number> = {};
    attendance?.forEach((a) => {
      if (a.status === "trained") {
        const dayName = format(parseISO(a.date), "EEEE");
        dayCount[dayName] = (dayCount[dayName] || 0) + 1;
      }
    });
    const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Calculate trends from InBody
    const getTrend = (records: InBodyRecord[], key: "weight_kg" | "body_fat_percentage" | "skeletal_muscle_kg") => {
      if (!records || records.length < 2) return null;
      const latest = records[records.length - 1][key];
      const previous = records[0][key];
      const diff = latest - previous;
      if (Math.abs(diff) < 0.5) return "stable";
      return diff > 0 ? "up" : "down";
    };

    // Identify risk flags
    const riskFlags: string[] = [];
    const lastTrained = attendance?.find((a) => a.status === "trained");
    const daysSinceTraining = lastTrained 
      ? differenceInDays(new Date(), parseISO(lastTrained.date))
      : 999;

    if (daysSinceTraining >= 7) {
      riskFlags.push("Inactive for 7+ days");
    } else if (daysSinceTraining >= 4) {
      riskFlags.push("No training in 4+ days");
    }

    if (missedDays >= 3) {
      riskFlags.push(`${missedDays} missed sessions this month`);
    }

    if (consistencyScore < 50 && totalLogged > 7) {
      riskFlags.push("Low consistency score");
    }

    setInsights({
      goal: clientProfile?.goal || null,
      startDate: clientProfile?.created_at || null,
      currentStreak,
      consistencyScore,
      trainedDays,
      missedDays,
      restDays,
      totalLogged,
      bestDay,
      riskFlags,
      lastTrainedDate: lastTrained?.date || null,
      weightTrend: getTrend(inbodyRecords, "weight_kg"),
      fatTrend: getTrend(inbodyRecords, "body_fat_percentage"),
      muscleTrend: getTrend(inbodyRecords, "skeletal_muscle_kg"),
    });

    setIsLoading(false);
  };

  const TrendIcon = ({ trend, positive }: { trend: "up" | "down" | "stable" | null; positive: "up" | "down" }) => {
    if (!trend) return null;
    if (trend === "stable") return <Minus className="h-4 w-4 text-muted-foreground" />;
    const isGood = trend === positive;
    if (trend === "up") {
      return <TrendingUp className={`h-4 w-4 ${isGood ? "text-green-500" : "text-red-500"}`} />;
    }
    return <TrendingDown className={`h-4 w-4 ${isGood ? "text-green-500" : "text-red-500"}`} />;
  };

  if (isLoading) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  if (compact) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Goal</span>
          <span className="font-medium capitalize">{insights.goal?.replace("_", " ") || "Not set"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Streak</span>
          <span className="font-medium flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            {insights.currentStreak} days
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Consistency</span>
          <span className="font-medium">{insights.consistencyScore}%</span>
        </div>
        {insights.lastTrainedDate && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last trained</span>
            <span className="font-medium">{format(parseISO(insights.lastTrainedDate), "MMM d")}</span>
          </div>
        )}
        {insights.riskFlags.length > 0 && (
          <div className="pt-2 border-t">
            {insights.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">{flag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Flags */}
      {insights.riskFlags.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Attention Needed</p>
                {insights.riskFlags.map((flag, i) => (
                  <p key={i} className="text-sm text-yellow-600 dark:text-yellow-400">{flag}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="font-medium capitalize text-sm">
                  {insights.goal?.replace("_", " ") || "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="font-medium text-sm">{insights.currentStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consistency Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Consistency Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{insights.consistencyScore}%</span>
              <Badge variant={insights.consistencyScore >= 70 ? "default" : insights.consistencyScore >= 50 ? "secondary" : "destructive"}>
                {insights.consistencyScore >= 70 ? "Great" : insights.consistencyScore >= 50 ? "Fair" : "Needs Work"}
              </Badge>
            </div>
            <Progress value={insights.consistencyScore} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Last 30 days</span>
              <span>{insights.trainedDays} trained, {insights.restDays} rest, {insights.missedDays} missed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Behavior Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.bestDay && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Best training day</span>
              <span className="font-medium">{insights.bestDay}</span>
            </div>
          )}
          {insights.lastTrainedDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last trained</span>
              <span className="font-medium">{format(parseISO(insights.lastTrainedDate), "MMM d, yyyy")}</span>
            </div>
          )}
          {insights.startDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Client since</span>
              <span className="font-medium">{format(parseISO(insights.startDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body Composition Trends */}
      {(insights.weightTrend || insights.fatTrend || insights.muscleTrend) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Body Composition Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <TrendIcon trend={insights.weightTrend} positive={insights.goal === "lose_fat" ? "down" : "up"} />
                  <span className="text-sm font-medium">Weight</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{insights.weightTrend || "—"}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <TrendIcon trend={insights.fatTrend} positive="down" />
                  <span className="text-sm font-medium">Body Fat</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{insights.fatTrend || "—"}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <TrendIcon trend={insights.muscleTrend} positive="up" />
                  <span className="text-sm font-medium">Muscle</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{insights.muscleTrend || "—"}</p>
              </div>
            </div>
            <div className="mt-4">
              {inbodyRecords.length > 0 && (
                <InBodyMiniChart records={inbodyRecords} insights={inbodyInsights} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}