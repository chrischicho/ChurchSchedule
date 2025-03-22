import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfMonth, addMonths, eachDayOfInterval, isSunday, subMonths } from "date-fns";
import { Availability, User, SpecialDay } from "@shared/schema";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, Users, Calendar, LayoutGrid, List } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type ViewType = 'card' | 'table';

// Separate dialog component for better organization
const DeadlineNoticeDialog = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => (
  <AlertDialog open={isOpen} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogDescription className="text-center py-4">
        Sorry, it has passed the deadline. If you want to change your availability for this month, please contact the coordinator
      </AlertDialogDescription>
      <div className="flex justify-center">
        <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

export default function RosterPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [viewType, setViewType] = useState<ViewType>('card');
  const [showDeadlineNotice, setShowDeadlineNotice] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  const { data: availabilities, isLoading: isLoadingAvailability } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: nameFormat } = useQuery<{ format: string }>({
    queryKey: ["/api/admin/name-format"],
  });
  
  // Fetch special days
  const { data: specialDays, isLoading: isLoadingSpecialDays } = useQuery<SpecialDay[]>({
    queryKey: ["/api/special-days"],
  });

  const isLoading = isLoadingAvailability || isLoadingUsers || isLoadingSpecialDays;
  
  // Process availability data to determine which months have data
  useEffect(() => {
    if (availabilities && Array.isArray(availabilities)) {
      // Get months with available members
      const months = new Set<string>();
      
      // Only include records where someone is available
      availabilities
        .filter(record => record.isAvailable)
        .forEach(record => {
          const date = new Date(record.serviceDate);
          const monthYear = format(date, 'yyyy-MM'); // Format as YYYY-MM for uniqueness
          months.add(monthYear);
        });
      
      // Convert to Date objects (first day of each month)
      const monthDates = Array.from(months).map(monthStr => {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
      });
      
      // Sort by date
      monthDates.sort((a, b) => a.getTime() - b.getTime());
      
      setAvailableMonths(monthDates);
      
      // If there are available months and current selection isn't in the list,
      // select the most recent month
      if (monthDates.length > 0) {
        const currentMonthYear = format(selectedMonth, 'yyyy-MM');
        const hasCurrentMonth = Array.from(months).includes(currentMonthYear);
        
        if (!hasCurrentMonth) {
          // Get the most recent month (last in the sorted array)
          setSelectedMonth(monthDates[monthDates.length - 1]);
        }
      }
    }
  }, [availabilities, selectedMonth]);

  const sundays = eachDayOfInterval({
    start: selectedMonth,
    end: addMonths(selectedMonth, 1),
  }).filter(day => isSunday(day));

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

  const handleAvailabilityUpdate = async (user: User, date: Date, isAvailable: boolean) => {
    try {
      const response = await apiRequest("POST", "/api/availability", {
        userId: user.id,
        serviceDate: date,
        isAvailable,
      });

      const data = await response.json();

      // If we get a notice about deadline, show the dialog
      if (data.type === "notice") {
        setShowDeadlineNotice(true);
        return;
      }


    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const CardView = () => (
    <div className="space-y-6">
      {sundays.map((sunday) => {
        const date = format(sunday, "yyyy-MM-dd");
        const availableUsers = groupedAvailabilities[date] || [];
        
        // Check if this Sunday is a special day
        const specialDay = specialDays?.find(day => {
          const specialDate = new Date(day.date);
          return format(specialDate, "yyyy-MM-dd") === format(sunday, "yyyy-MM-dd");
        });
        
        // Set card style based on special day
        const cardStyle = specialDay 
          ? { borderColor: specialDay.color, borderWidth: '2px' } 
          : {};

        return (
          <div 
            key={date} 
            className="bg-card rounded-lg border shadow-sm overflow-hidden"
            style={cardStyle}
          >
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                  style={{ color: specialDay?.color || 'var(--color-primary)' }}
                >
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      {format(sunday, "MMMM d, yyyy")}
                      {specialDay && (
                        <Badge 
                          style={{ 
                            backgroundColor: specialDay.color,
                            color: '#ffffff' 
                          }}
                        >
                          {specialDay.name}
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {specialDay?.description && <span className="font-medium">{specialDay.description}</span>}
                    {specialDay?.description && " • "}
                    {availableUsers.length} {availableUsers.length === 1 ? 'member' : 'members'} available
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {availableUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {availableUsers
                    .sort((a, b) => {
                      const lastNameCompare = b.lastName.localeCompare(a.lastName);
                      if (lastNameCompare !== 0) return -lastNameCompare;
                      return -b.firstName.localeCompare(a.firstName);
                    })
                    .map((user) => (
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
  );

  const TableView = () => (
    <div className="rounded-md border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Available Members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sundays.map((sunday) => {
            const date = format(sunday, "yyyy-MM-dd");
            const availableUsers = groupedAvailabilities[date] || [];

            return (
              <TableRow key={date}>
                <TableCell className="font-medium">
                  {format(sunday, "MMMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {availableUsers.length > 0
                    ? availableUsers
                        .sort((a, b) => {
                          const lastNameCompare = b.lastName.localeCompare(a.lastName);
                          if (lastNameCompare !== 0) return -lastNameCompare;
                          return -b.firstName.localeCompare(a.firstName);
                        })
                        .map(user => formatUserName(user))
                        .join(", ")
                    : <span className="text-muted-foreground">No members available</span>
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Service Roster
              </h1>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <Button
                    variant={viewType === 'card' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewType('card')}
                    title="Card View"
                    className="h-8 w-8"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewType === 'table' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewType('table')}
                    title="Simple View"
                    className="h-8 w-8"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Popover open={showMonthSelector} onOpenChange={setShowMonthSelector}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-w-[150px] justify-start text-left font-normal"
                      onClick={() => setShowMonthSelector(true)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(selectedMonth, "MMMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <div className="p-2 text-center text-sm font-medium border-b">
                      Available Months
                    </div>
                    {availableMonths.length > 0 ? (
                      <div className="p-3">
                        {availableMonths.map((month) => (
                          <Button
                            key={format(month, 'yyyy-MM')}
                            variant={format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM') ? "default" : "outline"}
                            className="w-full mb-2"
                            onClick={() => {
                              setSelectedMonth(month);
                              setShowMonthSelector(false);
                            }}
                          >
                            {format(month, 'MMMM yyyy')}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3">
                        <p className="text-sm text-center text-muted-foreground">
                          No months with availability data
                        </p>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {viewType === 'card' ? <CardView /> : <TableView />}
        </div>
      </main>

      <DeadlineNoticeDialog 
        isOpen={showDeadlineNotice} 
        onClose={() => setShowDeadlineNotice(false)} 
      />
    </div>
  );
}