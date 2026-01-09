import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, UserPlus } from "lucide-react";
import { CoachingRequest } from "@/hooks/useCoachingRequests";
import { PendingRequestCard } from "./PendingRequestCard";

interface PendingRequestsInboxProps {
  requests: CoachingRequest[];
  onResponded?: () => void;
}

export function PendingRequestsInbox({ requests, onResponded }: PendingRequestsInboxProps) {
  const pendingRequests = requests.filter(r => r.status === "pending");

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No pending requests</h3>
            <p className="text-sm text-muted-foreground">
              New client requests will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Pending Requests
            </CardTitle>
            <CardDescription>
              Review and respond to coaching requests
            </CardDescription>
          </div>
          <Badge className="bg-primary text-primary-foreground">
            {pendingRequests.length} new
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3 pr-4">
            {pendingRequests.map((request) => (
              <PendingRequestCard 
                key={request.id} 
                request={request} 
                onResponded={onResponded}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
