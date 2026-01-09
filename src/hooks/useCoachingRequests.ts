import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type CoachingRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type FitnessGoal = "lose_fat" | "gain_muscle" | "performance" | "general_fitness" | "other";
export type TrainingExperience = "beginner" | "intermediate" | "advanced";

export interface CoachingRequest {
  id: string;
  client_id: string;
  coach_id: string;
  status: CoachingRequestStatus;
  goal: FitnessGoal;
  experience: TrainingExperience;
  availability_days: number;
  message: string | null;
  coach_response: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  // Joined data
  client_name?: string | null;
  client_email?: string;
  coach_name?: string | null;
}

interface CreateRequestData {
  coach_id: string;
  goal: FitnessGoal;
  experience: TrainingExperience;
  availability_days: number;
  message?: string;
}

export function useCoachingRequests() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("coaching_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each request
      const enrichedRequests = await Promise.all(
        (data || []).map(async (req) => {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", req.client_id)
            .maybeSingle();
          
          const { data: coachProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", req.coach_id)
            .maybeSingle();

          return {
            ...req,
            client_name: clientProfile?.full_name,
            client_email: clientProfile?.email,
            coach_name: coachProfile?.full_name,
          } as CoachingRequest;
        })
      );

      setRequests(enrichedRequests);
      setPendingCount(enrichedRequests.filter(r => r.status === "pending").length);
    } catch (error) {
      console.error("Error fetching coaching requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  const createRequest = useCallback(async (data: CreateRequestData): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check for existing pending request to this coach
      const { data: existing } = await supabase
        .from("coaching_requests")
        .select("id")
        .eq("client_id", user.id)
        .eq("coach_id", data.coach_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast({
          variant: "destructive",
          title: "Request already pending",
          description: "You already have a pending request with this coach.",
        });
        return false;
      }

      const { error } = await supabase
        .from("coaching_requests")
        .insert({
          client_id: user.id,
          coach_id: data.coach_id,
          goal: data.goal,
          experience: data.experience,
          availability_days: data.availability_days,
          message: data.message || null,
        });

      if (error) throw error;

      toast({
        title: "Request sent!",
        description: "Your coaching request has been submitted. The coach will review it shortly.",
      });
      
      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error creating request:", error);
      toast({
        variant: "destructive",
        title: "Failed to send request",
        description: "Please try again.",
      });
      return false;
    }
  }, [user, toast, fetchRequests]);

  const respondToRequest = useCallback(async (
    requestId: string, 
    status: "accepted" | "rejected",
    response?: string
  ): Promise<boolean> => {
    if (!user || role !== "coach") return false;

    try {
      // Get the request first
      const { data: request, error: fetchError } = await supabase
        .from("coaching_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) throw fetchError || new Error("Request not found");

      // Update the request status
      const { error: updateError } = await supabase
        .from("coaching_requests")
        .update({
          status,
          coach_response: response || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If accepted, create the coach-client assignment
      if (status === "accepted") {
        // Deactivate any existing assignments for this client
        await supabase
          .from("coach_client_assignments")
          .update({ is_active: false })
          .eq("client_id", request.client_id);

        // Create new assignment
        const { error: assignError } = await supabase
          .from("coach_client_assignments")
          .insert({
            coach_id: user.id,
            client_id: request.client_id,
            is_active: true,
          });

        if (assignError) throw assignError;
      }

      toast({
        title: status === "accepted" ? "Client accepted!" : "Request declined",
        description: status === "accepted" 
          ? "You can now work with this client."
          : "The client has been notified.",
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error responding to request:", error);
      toast({
        variant: "destructive",
        title: "Failed to respond",
        description: "Please try again.",
      });
      return false;
    }
  }, [user, role, toast, fetchRequests]);

  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("coaching_requests")
        .update({ status: "cancelled" as const })
        .eq("id", requestId)
        .eq("client_id", user.id);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your coaching request has been cancelled.",
      });

      await fetchRequests();
      return true;
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        variant: "destructive",
        title: "Failed to cancel",
        description: "Please try again.",
      });
      return false;
    }
  }, [user, toast, fetchRequests]);

  // Check if client has pending request to specific coach
  const hasPendingRequestTo = useCallback((coachId: string): boolean => {
    return requests.some(r => r.coach_id === coachId && r.status === "pending");
  }, [requests]);

  // Get client's current request status for a coach
  const getRequestStatus = useCallback((coachId: string): CoachingRequest | null => {
    return requests.find(r => r.coach_id === coachId) || null;
  }, [requests]);

  return {
    requests,
    isLoading,
    pendingCount,
    createRequest,
    respondToRequest,
    cancelRequest,
    hasPendingRequestTo,
    getRequestStatus,
    refetch: fetchRequests,
  };
}
