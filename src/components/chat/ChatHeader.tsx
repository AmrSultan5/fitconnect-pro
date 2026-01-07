import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ChatHeaderProps {
  name: string;
  subtitle?: string;
  backTo?: string;
}

export function ChatHeader({ name, subtitle, backTo }: ChatHeaderProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      {backTo && (
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to={backTo}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      )}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold truncate">{name}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
