import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import { ArrowLeft, Target, Flame, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ClientInsightsPanel } from "@/components/coach/ClientInsightsPanel";

interface CoachChatHeaderProps {
  clientId: string;
  clientName: string;
}

interface QuickInsights {
  goal: string | null;
  streak: number;
  lastTrainedDaysAgo: number | null;
}

export function CoachChatHeader({ clientId, clientName }: CoachChatHeaderProps) {
  const [insights, setInsights] = useState<QuickInsights | null>(null);
  const [showFullInsights, setShowFullInsights] = useState(false);

  useEffect(() => {
    fetchQuickInsights();
  }, [clientId]);

  const fetchQuickInsights = async () => {
    // Get client goal
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("goal")
      .eq("user_id", clientId)
      .maybeSingle();

    // Get attendance for streak and last trained
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const { data: attendance } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("user_id", clientId)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false });

    // Calculate streak
    let streak = 0;
    if (attendance) {
      for (const record of attendance) {
        if (record.status === "trained" || record.status === "rest") {
          streak++;
        } else {
          break;
        }
      }
    }

    // Last trained
    const lastTrained = attendance?.find((a) => a.status === "trained");
    const lastTrainedDaysAgo = lastTrained
      ? differenceInDays(new Date(), parseISO(lastTrained.date))
      : null;

    setInsights({
      goal: clientProfile?.goal || null,
      streak,
      lastTrainedDaysAgo,
    });
  };

  const initials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="border-b">
      {/* Main header */}
      <div className="flex items-center gap-3 p-4">
        <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
          <Link to={`/coach/clients/${clientId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <Avatar className="h-10 w-10 border">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{clientName}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Client</span>
            {insights?.goal && (
              <>
                <span>•</span>
                <span className="capitalize">{insights.goal.replace("_", " ")}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick stats */}
        {insights && (
          <div className="hidden sm:flex items-center gap-3">
            {insights.streak > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{insights.streak}d</span>
              </div>
            )}
            {insights.lastTrainedDaysAgo !== null && (
              <Badge variant={insights.lastTrainedDaysAgo <= 2 ? "default" : insights.lastTrainedDaysAgo <= 4 ? "secondary" : "destructive"}>
                {insights.lastTrainedDaysAgo === 0
                  ? "Today"
                  : insights.lastTrainedDaysAgo === 1
                  ? "Yesterday"
                  : `${insights.lastTrainedDaysAgo}d ago`}
              </Badge>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFullInsights(!showFullInsights)}
          className="flex items-center gap-1"
        >
          Insights
          {showFullInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expandable insights panel */}
      {showFullInsights && (
        <div className="px-4 pb-4 border-t bg-muted/30">
          <div className="pt-4 max-h-64 overflow-y-auto">
            <ClientInsightsPanel clientId={clientId} compact />
          </div>
        </div>
      )}
    </div>
  );
}