import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, User, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCoachingRequests } from "@/hooks/useCoachingRequests";

const goalLabels: Record<string, string> = {
  lose_fat: "Lose Fat",
  gain_muscle: "Gain Muscle",
  performance: "Performance",
  general_fitness: "General Fitness",
  other: "Other",
};

export function ClientRequestStatus() {
  const { requests, isLoading, cancelRequest } = useCoachingRequests();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground animate-pulse">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent pending request
  const pendingRequest = requests.find((r) => r.status === "pending");
  
  // Get accepted request if any
  const acceptedRequest = requests.find((r) => r.status === "accepted");

  // If no pending request and no recent activity, show find coach prompt
  if (!pendingRequest && !acceptedRequest) {
    const recentRejection = requests.find((r) => r.status === "rejected");
    
    if (recentRejection) {
      return (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Request Declined
            </CardTitle>
            <CardDescription>
              Your request to {recentRejection.coach_name || "this coach"} was declined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRejection.coach_response && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground mb-1">Coach's response:</p>
                <p className="text-foreground">"{recentRejection.coach_response}"</p>
              </div>
            )}
            <Button onClick={() => navigate("/coaches")} className="w-full gap-2">
              Find Another Coach
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Find a Coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            to="/coaches"
            className="flex items-center gap-4 rounded-xl border-2 border-dashed p-4 hover:border-primary transition-colors"
          >
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Browse Coaches</p>
              <p className="text-sm text-muted-foreground">
                Find a certified coach to start your fitness journey
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Show pending request card
  if (pendingRequest) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
            Request Pending
          </CardTitle>
          <CardDescription>
            Waiting for {pendingRequest.coach_name || "the coach"} to review your request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{goalLabels[pendingRequest.goal] || pendingRequest.goal}</Badge>
            <Badge variant="outline">{pendingRequest.availability_days} days/week</Badge>
          </div>
          
          {pendingRequest.message && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground mb-1">Your message:</p>
              <p className="text-foreground line-clamp-2">"{pendingRequest.message}"</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/coaches/${pendingRequest.coach_id}`)}
              className="flex-1"
            >
              View Coach
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => cancelRequest(pendingRequest.id)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Accepted but the coach card will handle this case
  return null;
}
