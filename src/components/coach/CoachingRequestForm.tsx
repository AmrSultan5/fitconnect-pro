import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Dumbbell, Calendar, MessageSquare } from "lucide-react";
import { useCoachingRequests, FitnessGoal, TrainingExperience } from "@/hooks/useCoachingRequests";

interface CoachingRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  coachName: string;
}

const goalLabels: Record<FitnessGoal, string> = {
  lose_fat: "Lose Fat",
  gain_muscle: "Gain Muscle",
  performance: "Improve Performance",
  general_fitness: "General Fitness",
  other: "Other",
};

const experienceLabels: Record<TrainingExperience, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function CoachingRequestForm({ open, onOpenChange, coachId, coachName }: CoachingRequestFormProps) {
  const { createRequest } = useCoachingRequests();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goal, setGoal] = useState<FitnessGoal | "">("");
  const [experience, setExperience] = useState<TrainingExperience | "">("");
  const [availabilityDays, setAvailabilityDays] = useState([3]);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!goal || !experience) return;
    
    setIsSubmitting(true);
    const success = await createRequest({
      coach_id: coachId,
      goal,
      experience,
      availability_days: availabilityDays[0],
      message: message.trim() || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      // Reset form
      setGoal("");
      setExperience("");
      setAvailabilityDays([3]);
      setMessage("");
    }
  };

  const isValid = goal && experience;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Request Coaching
          </DialogTitle>
          <DialogDescription>
            Send a coaching request to <span className="font-medium text-foreground">{coachName}</span>. 
            They'll review your profile and goals before accepting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Goal Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              What's your primary goal?
            </Label>
            <Select value={goal} onValueChange={(v) => setGoal(v as FitnessGoal)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your goal" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(goalLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              Training experience level
            </Label>
            <Select value={experience} onValueChange={(v) => setExperience(v as TrainingExperience)}>
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(experienceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Days available per week
            </Label>
            <div className="px-2">
              <Slider
                value={availabilityDays}
                onValueChange={setAvailabilityDays}
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>1 day</span>
                <Badge variant="secondary" className="text-sm">
                  {availabilityDays[0]} {availabilityDays[0] === 1 ? "day" : "days"} / week
                </Badge>
                <span>7 days</span>
              </div>
            </div>
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Introduce yourself <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the coach about yourself, your fitness history, any injuries, or specific needs..."
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
