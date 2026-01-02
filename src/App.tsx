import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Auth from "./pages/Auth";
import ClientDashboard from "./pages/client/ClientDashboard";
import AttendanceHistory from "./pages/client/AttendanceHistory";
import WorkoutPlans from "./pages/client/WorkoutPlans";
import DietPlans from "./pages/client/DietPlans";
import ProgressPhotos from "./pages/client/ProgressPhotos";
import CoachPage from "./pages/client/CoachPage";
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Client Routes */}
            <Route path="/client" element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/workouts" element={<ProtectedRoute allowedRoles={["client"]}><WorkoutPlans /></ProtectedRoute>} />
            <Route path="/client/diets" element={<ProtectedRoute allowedRoles={["client"]}><DietPlans /></ProtectedRoute>} />
            <Route path="/client/progress-photos" element={<ProtectedRoute allowedRoles={["client"]}><ProgressPhotos /></ProtectedRoute>} />
            <Route path="/client/attendance" element={<ProtectedRoute allowedRoles={["client"]}><AttendanceHistory /></ProtectedRoute>} />
            <Route path="/client/coach" element={<ProtectedRoute allowedRoles={["client"]}><CoachPage /></ProtectedRoute>} />
            
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
            
            {/* Coach Marketplace (accessible to clients) */}
            <Route path="/coaches" element={<ProtectedRoute allowedRoles={["client"]}><CoachMarketplace /></ProtectedRoute>} />
            <Route path="/coaches/:coachId" element={<ProtectedRoute allowedRoles={["client"]}><CoachProfilePage /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
