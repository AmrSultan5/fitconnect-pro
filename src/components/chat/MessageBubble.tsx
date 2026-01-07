import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface MessageBubbleProps {
  message: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
  showTimestamp?: boolean;
}

export function MessageBubble({ 
  message, 
  timestamp, 
  isOwn, 
  isRead = false,
  showTimestamp = true 
}: MessageBubbleProps) {
  const time = new Date(timestamp);
  const formattedTime = format(time, "HH:mm");

  return (
    <div
      className={cn(
        "flex w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message}
        </p>
        {showTimestamp && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span
              className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {formattedTime}
            </span>
            {isOwn && (
              isRead ? (
                <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
              ) : (
                <Check className="h-3 w-3 text-primary-foreground/70" />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  let label = format(date, "EEEE, MMMM d, yyyy");
  
  if (isToday(date)) {
    label = "Today";
  } else if (isYesterday(date)) {
    label = "Yesterday";
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full">
        {label}
      </div>
    </div>
  );
}
