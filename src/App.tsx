import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileCompletionGuard } from "@/components/ProfileCompletionGuard";

import Auth from "./pages/Auth";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientSettings from "./pages/client/ClientSettings";
import AttendanceHistory from "./pages/client/AttendanceHistory";
import WorkoutPlans from "./pages/client/WorkoutPlans";
import DietPlans from "./pages/client/DietPlans";
import ProgressPhotos from "./pages/client/ProgressPhotos";
import CoachPage from "./pages/client/CoachPage";
import InBody from "./pages/client/InBody";
import CoachDashboard from "./pages/coach/CoachDashboard";
import ClientDetailPage from "./pages/coach/ClientDetailPage";
import WorkoutPlansPage from "./pages/coach/WorkoutPlansPage";
import CreateWorkoutPlan from "./pages/coach/CreateWorkoutPlan";
import DietPlansPage from "./pages/coach/DietPlansPage";
import CreateDietPlan from "./pages/coach/CreateDietPlan";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CoachMarketplace from "./pages/coaches/CoachMarketplace";
import CoachProfilePage from "./pages/coaches/CoachProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Client Routes - Settings exempt from profile guard */}
              <Route path="/client/settings" element={<ProtectedRoute allowedRoles={["client"]}><ClientSettings /></ProtectedRoute>} />
              
              {/* Client Routes - Require profile completion */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><ClientDashboard /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/workouts" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><WorkoutPlans /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/diets" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><DietPlans /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/progress-photos" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><ProgressPhotos /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/attendance" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><AttendanceHistory /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/coach" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><CoachPage /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/client/inbody" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><InBody /></ProfileCompletionGuard></ProtectedRoute>} />
              
              {/* Coach Routes */}
              <Route path="/coach" element={<ProtectedRoute allowedRoles={["coach"]}><CoachDashboard /></ProtectedRoute>} />
              <Route path="/coach/clients" element={<ProtectedRoute allowedRoles={["coach"]}><CoachDashboard /></ProtectedRoute>} />
              <Route path="/coach/clients/:clientId" element={<ProtectedRoute allowedRoles={["coach"]}><ClientDetailPage /></ProtectedRoute>} />
              <Route path="/coach/workouts" element={<ProtectedRoute allowedRoles={["coach"]}><WorkoutPlansPage /></ProtectedRoute>} />
              <Route path="/coach/workouts/new" element={<ProtectedRoute allowedRoles={["coach"]}><CreateWorkoutPlan /></ProtectedRoute>} />
              <Route path="/coach/diets" element={<ProtectedRoute allowedRoles={["coach"]}><DietPlansPage /></ProtectedRoute>} />
              <Route path="/coach/diets/new" element={<ProtectedRoute allowedRoles={["coach"]}><CreateDietPlan /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/coaches" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              
              {/* Coach Marketplace (accessible to clients) - Require profile completion */}
              <Route path="/coaches" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><CoachMarketplace /></ProfileCompletionGuard></ProtectedRoute>} />
              <Route path="/coaches/:coachId" element={<ProtectedRoute allowedRoles={["client"]}><ProfileCompletionGuard><CoachProfilePage /></ProfileCompletionGuard></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
