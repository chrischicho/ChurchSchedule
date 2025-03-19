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
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, Users, Calendar } from "lucide-react";

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

  // Group availabilities by date
  const groupedAvailabilities = availabilities?.reduce((groups, availability) => {
    const date = format(new Date(availability.serviceDate), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    const user = users?.find(u => u.id === availability.userId);
    if (user && availability.isAvailable) {
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

          <div className="space-y-6">
            {sundays.map((sunday) => {
              const date = format(sunday, "yyyy-MM-dd");
              const availableUsers = groupedAvailabilities[date] || [];

              return (
                <div key={date} className="bg-card rounded-lg border shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">
                          {format(sunday, "MMMM d, yyyy")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {availableUsers.length} {availableUsers.length === 1 ? 'member' : 'members'} available
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {availableUsers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {availableUsers.map((user, index) => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                          >
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm">{formatUserName(user)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No members have indicated availability yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}