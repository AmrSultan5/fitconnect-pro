import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Heart,
  Dumbbell,
  ChevronRight,
  Lightbulb,
  X,
} from "lucide-react";

interface ChatSuggestionsProps {
  clientId: string;
  onUseSuggestion: (text: string) => void;
}

interface Suggestion {
  id: string;
  type: "encouragement" | "warning" | "followup" | "motivation";
  title: string;
  message: string;
  icon: React.ReactNode;
}

export function ChatSuggestions({ clientId, onUseSuggestion }: ChatSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    generateSuggestions();
  }, [clientId]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    const newSuggestions: Suggestion[] = [];

    // Fetch attendance data
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const { data: attendance } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("user_id", clientId)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false });

    // Fetch client profile
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("goal")
      .eq("user_id", clientId)
      .maybeSingle();

    // Fetch client name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", clientId)
      .maybeSingle();

    const firstName = profile?.full_name?.split(" ")[0] || "there";
    const goal = clientProfile?.goal?.replace("_", " ") || "fitness goals";

    // Calculate metrics
    const lastTrained = attendance?.find((a) => a.status === "trained");
    const daysSinceTraining = lastTrained 
      ? differenceInDays(new Date(), parseISO(lastTrained.date))
      : 999;

    const trainedCount = attendance?.filter((a) => a.status === "trained").length || 0;
    const missedCount = attendance?.filter((a) => a.status === "missed").length || 0;

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

    // Generate contextual suggestions
    if (daysSinceTraining >= 5) {
      newSuggestions.push({
        id: "inactive-warning",
        type: "warning",
        title: "Re-engagement Needed",
        message: `Hey ${firstName}! I noticed it's been ${daysSinceTraining === 999 ? "a while" : `${daysSinceTraining} days`} since your last workout. Is everything okay? Let's get back on track together!`,
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
      });
    } else if (daysSinceTraining >= 3) {
      newSuggestions.push({
        id: "gentle-reminder",
        type: "followup",
        title: "Gentle Check-in",
        message: `Hi ${firstName}, just checking in! Haven't seen you log a workout in a few days. Remember, consistency beats perfection. Ready to get moving?`,
        icon: <Heart className="h-4 w-4 text-pink-500" />,
      });
    }

    if (streak >= 5) {
      newSuggestions.push({
        id: "streak-praise",
        type: "encouragement",
        title: "Celebrate Streak",
        message: `Amazing work ${firstName}! You're on a ${streak}-day streak! 🔥 Your dedication to ${goal} is really showing. Keep crushing it!`,
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      });
    }

    if (trainedCount >= 12 && missedCount <= 2) {
      newSuggestions.push({
        id: "progress-praise",
        type: "motivation",
        title: "Acknowledge Progress",
        message: `${firstName}, you've trained ${trainedCount} times this month with barely any missed sessions. That's exceptional discipline! Ready to level up your training?`,
        icon: <Dumbbell className="h-4 w-4 text-primary" />,
      });
    }

    if (missedCount >= 5) {
      newSuggestions.push({
        id: "adjust-schedule",
        type: "followup",
        title: "Schedule Discussion",
        message: `Hey ${firstName}, I've noticed some missed sessions lately. No judgment—life happens! Should we look at adjusting your schedule to better fit your lifestyle?`,
        icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
      });
    }

    // Default suggestion if nothing specific
    if (newSuggestions.length === 0) {
      newSuggestions.push({
        id: "general-checkin",
        type: "followup",
        title: "General Check-in",
        message: `Hey ${firstName}! Just wanted to check in and see how you're feeling about your ${goal} progress. Any questions or concerns I can help with?`,
        icon: <Heart className="h-4 w-4 text-pink-500" />,
      });
    }

    setSuggestions(newSuggestions);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-3 border-b bg-muted/30">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 to-transparent">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Suggestions</span>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </div>
        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {suggestion.icon}
                  <span className="text-sm font-medium">{suggestion.title}</span>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {suggestion.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {suggestion.message}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onUseSuggestion(suggestion.message)}
              >
                Use This Message
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}