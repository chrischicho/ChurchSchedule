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
import { format, startOfMonth, addMonths, eachDayOfInterval, isSunday, subMonths } from "date-fns";
import { Availability, User } from "@shared/schema";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, Users, CheckCircle2 } from "lucide-react";

export default function RosterPage() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));

  const { data: availabilities, isLoading: isLoadingAvailability } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: nameFormat } = useQuery<{ format: string }>({
    queryKey: ["/api/admin/name-format"],
  });

  const isLoading = isLoadingAvailability || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Get all Sundays in the selected month
  const sundays = eachDayOfInterval({
    start: selectedMonth,
    end: addMonths(selectedMonth, 1),
  }).filter(day => isSunday(day));

  // Format user name based on admin settings
  const formatUserName = (user: User) => {
    switch (nameFormat?.format) {
      case 'first':
        return user.firstName;
      case 'last':
        return user.lastName;
      case 'initials':
        return `${user.firstName[0]}${user.lastName[0]}`;
      default:
        return `${user.firstName} ${user.lastName}`;
    }
  };

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Service Roster
              </h1>
            </div>
            <div className="flex items-center gap-4 bg-muted px-3 py-1.5 rounded-lg shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedMonth(prev => startOfMonth(subMonths(prev, 1)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[120px] text-center font-medium">
                {format(selectedMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedMonth(prev => startOfMonth(addMonths(prev, 1)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead>Available Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sundays.map((sunday) => {
                  const date = format(sunday, "yyyy-MM-dd");
                  const availableUsers = groupedAvailabilities[date] || [];

                  return (
                    <TableRow key={date} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {format(sunday, "d")}
                          </div>
                          <div>
                            {format(sunday, "MMMM d, yyyy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {availableUsers.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{availableUsers.map(user => formatUserName(user)).join(", ")}</span>
                            <span className="text-muted-foreground ml-2">
                              ({availableUsers.length} {availableUsers.length === 1 ? 'member' : 'members'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Pending responses
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}