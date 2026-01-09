import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Clock, Target, Dumbbell, Calendar, MessageSquare, Loader2 } from "lucide-react";
import { CoachingRequest, useCoachingRequests } from "@/hooks/useCoachingRequests";
import { formatDistanceToNow } from "date-fns";

interface PendingRequestCardProps {
  request: CoachingRequest;
  onResponded?: () => void;
}

const goalLabels = {
  lose_fat: "Lose Fat",
  gain_muscle: "Gain Muscle",
  performance: "Performance",
  general_fitness: "General Fitness",
  other: "Other",
};

const experienceLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const experienceColors = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function PendingRequestCard({ request, onResponded }: PendingRequestCardProps) {
  const { respondToRequest } = useCoachingRequests();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const initials = request.client_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "?";

  const handleAccept = async () => {
    setIsAccepting(true);
    await respondToRequest(request.id, "accepted");
    setIsAccepting(false);
    onResponded?.();
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await respondToRequest(request.id, "rejected", rejectMessage || undefined);
    setIsRejecting(false);
    setShowRejectDialog(false);
    onResponded?.();
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md animate-slide-up">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Client Info */}
            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {request.client_name || request.client_email}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Target className="h-3 w-3" />
                  {goalLabels[request.goal]}
                </Badge>
                <Badge className={`gap-1 ${experienceColors[request.experience]}`}>
                  <Dumbbell className="h-3 w-3" />
                  {experienceLabels[request.experience]}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {request.availability_days}d/week
                </Badge>
              </div>

              {/* Message */}
              {request.message && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="flex items-center gap-1 text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3" />
                    Message
                  </p>
                  <p className="text-foreground line-clamp-3">{request.message}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 p-4 border-t sm:border-t-0 sm:border-l bg-muted/30 sm:justify-center">
              <Button
                onClick={handleAccept}
                disabled={isAccepting || isRejecting}
                className="flex-1 sm:flex-initial gap-2"
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={isAccepting || isRejecting}
                className="flex-1 sm:flex-initial gap-2"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this coaching request from{" "}
              <span className="font-medium text-foreground">
                {request.client_name || request.client_email}
              </span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Optional message to client
            </label>
            <Textarea
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder="Let them know why or suggest alternatives..."
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                "Decline Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
