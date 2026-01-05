import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Calendar,
  Image,
  ClipboardList,
  Utensils,
  Store,
  Settings,
  LogOut,
  Menu,
  User,
  Shield,
  MessageSquare,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const getClientNav = (coachName: string | null): NavItem[] => {
  const baseNav: NavItem[] = [
    { title: "Dashboard", href: "/client", icon: LayoutDashboard },
    { title: "Attendance", href: "/client/attendance", icon: Calendar },
    { title: "Workout Plan", href: "/client/workouts", icon: ClipboardList },
    { title: "Diet Plan", href: "/client/diets", icon: Utensils },
    { title: "InBody", href: "/client/inbody", icon: Scale },
    { title: "Progress Photos", href: "/client/progress-photos", icon: Image },
  ];

  if (coachName) {
    baseNav.push({ title: coachName, href: "/client/coach", icon: MessageSquare });
  } else {
    baseNav.push({ title: "Find a Coach", href: "/coaches", icon: Store });
  }

  baseNav.push({ title: "Settings", href: "/client/settings", icon: Settings });

  return baseNav;
};

const coachNav: NavItem[] = [
  { title: "Dashboard", href: "/coach", icon: LayoutDashboard },
  { title: "My Clients", href: "/coach/clients", icon: Users },
  { title: "Workout Plans", href: "/coach/workouts", icon: ClipboardList },
  { title: "Diet Plans", href: "/coach/diets", icon: Utensils },
];

const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Coaches", href: "/admin/coaches", icon: Users },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);

  const fetchCoachName = useCallback(async () => {
    if (!user || role !== "client") {
      setCoachName(null);
      return;
    }

    const { data: assignment } = await supabase
      .from("coach_client_assignments")
      .select("coach_id")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (assignment) {
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", assignment.coach_id)
        .maybeSingle();
      
      if (coachProfile?.full_name) {
        // Format as "Coach [FirstName]" or just first name if available
        const firstName = coachProfile.full_name.split(" ")[0];
        setCoachName(`Coach ${firstName}`);
      } else {
        setCoachName("My Coach");
      }
    } else {
      setCoachName(null);
    }
  }, [user, role]);

  useEffect(() => {
    fetchCoachName();
  }, [fetchCoachName, location.pathname]); // Refetch when navigating between pages

  const navItems = role === "admin" 
    ? adminNav 
    : role === "coach" 
    ? coachNav 
    : getClientNav(coachName);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );

  const roleIcon = role === "admin" ? Shield : role === "coach" ? Dumbbell : User;
  const RoleIcon = roleIcon;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="font-semibold">GymCoach</span>
        </div>
        <div className="flex-1 p-4">
          <NavLinks />
        </div>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
            <RoleIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm capitalize text-muted-foreground">{role}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2 border-b px-6">
                  <Dumbbell className="h-6 w-6 text-primary" />
                  <span className="font-semibold">GymCoach</span>
                </div>
                <div className="p-4">
                  <NavLinks onClick={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 lg:hidden">
              <Dumbbell className="h-5 w-5 text-primary" />
              <span className="font-semibold">GymCoach</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm md:inline-block">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={role === "client" ? "/client/settings" : "/settings"} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
