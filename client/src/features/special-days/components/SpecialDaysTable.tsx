import { Button } from "@/components/ui/button";
import { SpecialDay } from "@shared/schema";
import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";

interface SpecialDaysTableProps {
  specialDays: SpecialDay[];
  onEdit: (specialDay: SpecialDay) => void;
  onDelete: (specialDay: SpecialDay) => void;
}

/**
 * A table component for displaying special days
 */
export function SpecialDaysTable({ specialDays, onEdit, onDelete }: SpecialDaysTableProps) {
  if (!specialDays.length) {
    return null;
  }

  return (
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
              <td className="p-3">{format(new Date(specialDay.date), "d MMMM yyyy")}</td>
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
  );
}