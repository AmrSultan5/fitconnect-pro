import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

// Routes that don't require profile completion
const EXEMPT_ROUTES = ["/client/settings", "/auth"];

export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const checkProfileCompletion = useCallback(async () => {
    if (!user || role !== "client") {
      setIsCheckingProfile(false);
      setIsProfileComplete(true);
      return;
    }

    // Check if current route is exempt
    if (EXEMPT_ROUTES.some(route => location.pathname.startsWith(route))) {
      setIsCheckingProfile(false);
      setIsProfileComplete(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("age, height_cm, weight_kg, goal")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking profile:", error);
        setIsProfileComplete(true); // Don't block on error
        setIsCheckingProfile(false);
        return;
      }

      // Profile is incomplete if ANY of these are missing
      const isComplete = !!(
        data &&
        data.age !== null &&
        data.height_cm !== null &&
        data.weight_kg !== null &&
        data.goal !== null &&
        data.goal !== ""
      );

      setIsProfileComplete(isComplete);
      setShowModal(!isComplete);
    } catch (err) {
      console.error("Profile check failed:", err);
      setIsProfileComplete(true); // Don't block on error
    } finally {
      setIsCheckingProfile(false);
    }
  }, [user, role, location.pathname]);

  useEffect(() => {
    if (!authLoading) {
      checkProfileCompletion();
    }
  }, [authLoading, checkProfileCompletion]);

  const handleGoToSettings = () => {
    setShowModal(false);
    navigate("/client/settings");
  };

  // Show loading while checking
  if (authLoading || isCheckingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non-client users pass through
  if (role !== "client") {
    return <>{children}</>;
  }

  return (
    <>
      {/* Blocking modal for incomplete profile */}
      <AlertDialog open={showModal} onOpenChange={() => {}}>
        <AlertDialogContent className="sm:max-w-md [&>button]:hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Please complete your profile before using the app. We need some basic information to personalize your experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleGoToSettings}>
              Go to Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Render children but with overlay when profile incomplete */}
      <div className={!isProfileComplete ? "pointer-events-none opacity-50" : ""}>
        {children}
      </div>
    </>
  );
}
