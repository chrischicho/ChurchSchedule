import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChurchLoader } from "@/components/church-loader";
import { Button } from "@/components/ui/button";
import { SpecialDay } from "@shared/schema";
import { Edit, Trash2 } from "lucide-react";
import { SpecialDaysViewControls } from "./SpecialDaysViewControls";

interface SpecialDaysListProps {
  onEdit: (specialDay: SpecialDay) => void;
  onDelete: (specialDay: SpecialDay) => void;
}

export function SpecialDaysList({ onEdit, onDelete }: SpecialDaysListProps) {
  // Use state to track selected view mode
  const [viewMode, setViewMode] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Get all special days
  const { data: allSpecialDays, isLoading, isError } = useQuery<SpecialDay[]>({
    queryKey: ["/api/special-days"],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/special-days`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error fetching special days: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error("Error fetching special days:", error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Filter the days if we're in month view
  const specialDays = (() => {
    if (!allSpecialDays || viewMode === 'all') {
      return allSpecialDays;
    }
    
    // Filter by selected month
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    return allSpecialDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate.getFullYear() === year && dayDate.getMonth() === month;
    });
  })();

  // View Controls component
  function ViewControls() {
    return (
      <SpecialDaysViewControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onAdd={() => onAdd()}
      />
    );
  }

  // Handler to add a new special day
  const onAdd = () => {
    // This will be handled by the parent component
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <ChurchLoader 
          type="calendar" 
          size="md" 
          text="Loading special days..." 
        />
      </div>
    );
  }

  // Display empty state based on the view mode
  if (!specialDays?.length) {
    return (
      <>
        <ViewControls />
        <div className="text-center p-4 border rounded-md bg-muted/10">
          <p className="text-muted-foreground">
            {viewMode === 'month' 
              ? `No special days marked for ${format(selectedMonth, "MMMM yyyy")}`
              : "No special days have been created yet"}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ViewControls />
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Colour</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {specialDays.map((specialDay) => (
              <tr key={specialDay.id} className="border-b">
                <td className="p-3">{format(new Date(specialDay.date), "MMMM d, yyyy")}</td>
                <td className="p-3 font-medium">{specialDay.name}</td>
                <td className="p-3 text-muted-foreground">{specialDay.description || "-"}</td>
                <td className="p-3">
                  <div className="flex items-center">
                    <div 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: specialDay.color }} 
                    />
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(specialDay)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDelete(specialDay)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}