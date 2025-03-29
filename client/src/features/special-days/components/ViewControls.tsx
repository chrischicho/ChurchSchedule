import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";

interface ViewControlsProps {
  viewMode: 'all' | 'month';
  setViewMode: (mode: 'all' | 'month') => void;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  onAdd: () => void;
}

/**
 * Controls for filtering and adding special days
 */
export function ViewControls({ 
  viewMode, 
  setViewMode, 
  selectedMonth, 
  setSelectedMonth, 
  onAdd 
}: ViewControlsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="space-x-2">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
        >
          All Special Days
        </Button>
        <Button
          variant={viewMode === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('month')}
        >
          By Month
        </Button>
        
        {viewMode === 'month' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("ml-2")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedMonth, "MMMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="month"
                captionLayout="dropdown-buttons"
                fromYear={2023}
                toYear={2030}
                selected={selectedMonth}
                onSelect={(date) => date && setSelectedMonth(date)}
                defaultMonth={selectedMonth}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Special Day
      </Button>
    </div>
  );
}