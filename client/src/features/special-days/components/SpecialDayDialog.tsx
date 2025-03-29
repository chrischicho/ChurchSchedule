import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SpecialDay } from "@shared/schema";

interface SpecialDayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  specialDay?: SpecialDay;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  formatDateForApi: (date: Date) => string;
}

/**
 * Dialog for creating or editing a special day
 */
export function SpecialDayDialog({
  isOpen,
  onClose,
  specialDay,
  onSubmit,
  isSubmitting,
  formatDateForApi
}: SpecialDayDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [color, setColor] = useState("#3B82F6"); // Default blue color

  // When editing, populate the form with existing values
  useEffect(() => {
    if (specialDay) {
      setName(specialDay.name);
      setDescription(specialDay.description || "");
      setDate(new Date(specialDay.date));
      setColor(specialDay.color);
    } else {
      // Reset form for new special day
      setName("");
      setDescription("");
      setDate(new Date());
      setColor("#3B82F6");
    }
  }, [specialDay, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !date) return;

    const formData = {
      name,
      description: description || undefined,
      date: formatDateForApi(date),
      color
    };

    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {specialDay ? "Edit Special Day" : "Add Special Day"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Easter Sunday"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this special day..."
                className="resize-none"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="color">Colour</Label>
              <div className="flex gap-2 items-center">
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: color }}
                />
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-8 p-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!name || !date || isSubmitting}
            >
              {isSubmitting ? "Saving..." : specialDay ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}