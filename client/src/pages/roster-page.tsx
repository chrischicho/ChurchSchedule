import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { Availability, User } from "@shared/schema";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function RosterPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));

  const { data: availabilities, isLoading: isLoadingAvailability } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = isLoadingAvailability || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Filter availabilities for the selected month and only show available members
  const monthlyAvailabilities = availabilities?.filter(a => {
    const availabilityDate = new Date(a.serviceDate);
    return availabilityDate.getMonth() === selectedMonth.getMonth() &&
           availabilityDate.getFullYear() === selectedMonth.getFullYear() &&
           a.isAvailable;
  });

  // Group availabilities by date
  const groupedAvailabilities = monthlyAvailabilities?.reduce((groups, availability) => {
    const date = format(new Date(availability.serviceDate), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    const user = users?.find(u => u.id === availability.userId);
    if (user) {
      groups[date].push(user);
    }
    return groups;
  }, {} as Record<string, User[]>) || {};

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Service Roster</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(prev => startOfMonth(subMonths(prev, 1)))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[120px] text-center font-medium">
              {format(selectedMonth, "MMMM yyyy")}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(prev => startOfMonth(addMonths(prev, 1)))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Available Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedAvailabilities)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, users]) => (
                  <TableRow key={date}>
                    <TableCell>
                      {format(new Date(date), "MMMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {users.map(user => `${user.firstName} ${user.lastName}`).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}