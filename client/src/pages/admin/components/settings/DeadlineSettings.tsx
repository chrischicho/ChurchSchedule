import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ChurchLoader } from "@/components/church-loader";
import { Settings } from "@shared/schema";
import { useState, useEffect } from "react";

interface DeadlineSettingsProps {
  settings: Settings | undefined;
  isLoading: boolean;
  onDeadlineDayChange: (day: number) => void;
  isUpdating: boolean;
}

export function DeadlineSettings({
  settings,
  isLoading,
  onDeadlineDayChange,
  isUpdating
}: DeadlineSettingsProps) {
  const [localDeadlineDay, setLocalDeadlineDay] = useState<number>(15);
  
  // Update local state when settings change
  useEffect(() => {
    if (settings?.deadlineDay !== undefined) {
      setLocalDeadlineDay(settings.deadlineDay);
    }
  }, [settings]);

  // Handle slider value change
  const handleSliderChange = (value: number[]) => {
    const day = value[0];
    setLocalDeadlineDay(day);
    
    // Debounce the API call to avoid too many requests
    // This is simpler than a proper debounce but works for this scenario
    if (day !== settings?.deadlineDay) {
      const timer = setTimeout(() => {
        onDeadlineDayChange(day);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Availability Deadline</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <ChurchLoader type="calendar" size="sm" text="Loading settings..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Deadline</CardTitle>
        <CardDescription>
          Set the day of the month when members should complete their availability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            <Slider
              value={[localDeadlineDay]}
              onValueChange={handleSliderChange}
              min={1}
              max={28}
              step={1}
              disabled={isUpdating}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Day 1</span>
              <span>Day 15</span>
              <span>Day 28</span>
            </div>
          </div>
          
          <div className="p-4 bg-muted rounded-md text-center">
            <p className="font-medium">Current deadline: Day {localDeadlineDay}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Members will be reminded to provide their availability by the {localDeadlineDay}
              {getDaySuffix(localDeadlineDay)} of each month.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get day suffix (st, nd, rd, th)
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}