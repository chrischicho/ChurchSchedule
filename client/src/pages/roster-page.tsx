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
import { Availability, User, SpecialDay, FinalizedRoster, RosterAssignment, ServiceRole } from "@shared/schema";
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Users, 
  Calendar, 
  LayoutGrid, 
  List,
  FileCheck,
  Check,
  AlertTriangle
} from "lucide-react";
import { ChurchLoader } from "@/components/church-loader";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// Interface for finalized roster response
interface FinalizedRosterResponse {
  finalizedRoster: FinalizedRoster;
  assignments: (RosterAssignment & {
    user: User;
    role: ServiceRole;
  })[];
}

export default function RosterPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [viewType, setViewType] = useState<ViewType>('card');
  const [showDeadlineNotice, setShowDeadlineNotice] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'availability' | 'finalized'>('availability');

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
  
  // Fetch finalized roster for the selected month
  const { 
    data: finalizedRosterData, 
    isLoading: isLoadingFinalizedRoster,
    isError: isFinalizedRosterError
  } = useQuery<FinalizedRosterResponse>({
    queryKey: [
      `/api/finalized-roster/${selectedMonth.getFullYear()}/${selectedMonth.getMonth() + 1}`
    ],
    // Don't show error when finalized roster not found
    retry: false,
    enabled: true
  });
  
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
      // Fix the apiRequest call with correct parameter order
      // First parameter is URL, second is options object
      const data = await apiRequest("/api/availability", {
        method: "POST",
        data: {
          userId: user.id,
          serviceDate: date,
          isAvailable,
        }
      } as any);

      // If we get a notice about deadline, show the dialog
      if (data.type === "notice") {
        setShowDeadlineNotice(true);
        return;
      }


    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  // Check if any data is still loading
  if (isLoadingAvailability || isLoadingUsers || isLoadingSpecialDays) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ChurchLoader type="calendar" size="lg" text="Loading roster..." />
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
                      {format(sunday, "d MMMM yyyy")}
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
            <TableHead>Type</TableHead>
            <TableHead>Available Members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sundays.map((sunday) => {
            const date = format(sunday, "yyyy-MM-dd");
            const availableUsers = groupedAvailabilities[date] || [];
            
            // Check if this Sunday is a special day
            const specialDay = specialDays?.find(day => {
              const specialDate = new Date(day.date);
              return format(specialDate, "yyyy-MM-dd") === format(sunday, "yyyy-MM-dd");
            });
            
            // Set row style based on special day
            const rowStyle = specialDay 
              ? { 
                  borderLeft: `4px solid ${specialDay.color}`,
                } 
              : {};

            return (
              <TableRow key={date} style={rowStyle}>
                <TableCell className="font-medium">
                  {format(sunday, "d MMMM yyyy")}
                </TableCell>
                <TableCell>
                  {specialDay ? (
                    <Badge 
                      style={{ 
                        backgroundColor: specialDay.color,
                        color: '#ffffff' 
                      }}
                    >
                      {specialDay.name}
                    </Badge>
                  ) : "Regular Sunday"}
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

  // Process finalized roster assignments - group by service date and role
  const groupedAssignments = finalizedRosterData?.assignments.reduce((result, assignment) => {
    const dateStr = format(new Date(assignment.serviceDate), "yyyy-MM-dd");
    
    if (!result[dateStr]) {
      result[dateStr] = {};
    }
    
    const roleName = assignment.role.name;
    if (!result[dateStr][roleName]) {
      result[dateStr][roleName] = [];
    }
    
    result[dateStr][roleName].push(assignment.user);
    return result;
  }, {} as Record<string, Record<string, User[]>>) || {};
  
  // Component for finalized roster card view
  const FinalizedCardView = () => {
    if (!finalizedRosterData) {
      return (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Finalized Roster</AlertTitle>
          <AlertDescription>
            The roster for {format(selectedMonth, "MMMM yyyy")} has not been finalized yet.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-6">
        <Alert  className="mb-6 bg-primary/10 border-primary">
          <Check className="h-4 w-4 text-primary" />
          <AlertTitle>Finalized Roster</AlertTitle>
          <AlertDescription>
            This roster was finalized on {format(new Date(finalizedRosterData.finalizedRoster.finalizedAt || finalizedRosterData.finalizedRoster.createdAt), "d MMMM yyyy")} and is ready for service.
          </AlertDescription>
        </Alert>
        
        {sundays.map((sunday) => {
          const dateStr = format(sunday, "yyyy-MM-dd");
          const assignments = groupedAssignments[dateStr] || {};
          const roleNames = Object.keys(assignments);
          
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
              key={dateStr} 
              className="bg-card rounded-lg border shadow-sm overflow-hidden"
              style={cardStyle}
            >
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                    style={{ color: specialDay?.color || 'var(--color-primary)' }}
                  >
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        {format(sunday, "d MMMM yyyy")}
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
                      {roleNames.length > 0 ? `${roleNames.length} roles assigned` : "No assignments"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {roleNames.length > 0 ? (
                  <div className="space-y-4">
                    {roleNames.map(roleName => (
                      <div key={roleName} className="border rounded-md p-3">
                        <h4 className="font-medium mb-2 text-sm text-primary">{roleName}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assignments[roleName].map(user => (
                            <div 
                              key={user.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                            >
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-sm">{formatUserName(user)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No assignments for this service
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Component for finalized roster table view
  const FinalizedTableView = () => {
    if (!finalizedRosterData) {
      return (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Finalized Roster</AlertTitle>
          <AlertDescription>
            The roster for {format(selectedMonth, "MMMM yyyy")} has not been finalized yet.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <>
        <Alert  className="mb-6 bg-primary/10 border-primary">
          <Check className="h-4 w-4 text-primary" />
          <AlertTitle>Finalized Roster</AlertTitle>
          <AlertDescription>
            This roster was finalized on {format(new Date(finalizedRosterData.finalizedRoster.finalizedAt || finalizedRosterData.finalizedRoster.createdAt), "d MMMM yyyy")} and is ready for service.
          </AlertDescription>
        </Alert>
        
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sundays.map((sunday) => {
                const dateStr = format(sunday, "yyyy-MM-dd");
                const assignments = groupedAssignments[dateStr] || {};
                const roleNames = Object.keys(assignments);
                
                // Check if this Sunday is a special day
                const specialDay = specialDays?.find(day => {
                  const specialDate = new Date(day.date);
                  return format(specialDate, "yyyy-MM-dd") === format(sunday, "yyyy-MM-dd");
                });
                
                // Set row style based on special day
                const rowStyle = specialDay 
                  ? { 
                      borderLeft: `4px solid ${specialDay.color}`,
                    } 
                  : {};
                
                return (
                  <TableRow key={dateStr} style={rowStyle}>
                    <TableCell className="font-medium">
                      {format(sunday, "d MMMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {specialDay ? (
                        <Badge 
                          style={{ 
                            backgroundColor: specialDay.color,
                            color: '#ffffff' 
                          }}
                        >
                          {specialDay.name}
                        </Badge>
                      ) : "Regular Sunday"}
                    </TableCell>
                    <TableCell>
                      {roleNames.length > 0 ? (
                        <div className="space-y-1">
                          {roleNames.map(roleName => (
                            <div key={roleName} className="text-sm">
                              <span className="font-medium text-primary">{roleName}:</span>{' '}
                              {assignments[roleName]
                                .map(user => formatUserName(user))
                                .join(", ")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No assignments</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Church Service Schedule
              </h1>
            </div>
            
            <Tabs 
              defaultValue="availability" 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as 'availability' | 'finalized')}
              className="mb-6"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="availability">Member's Availability</TabsTrigger>
                <TabsTrigger value="finalized">Service Roster</TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
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
              
              <TabsContent value="availability" className="mt-4">
                {viewType === 'card' ? <CardView /> : <TableView />}
              </TabsContent>
              
              <TabsContent value="finalized" className="mt-4">
                {isLoadingFinalizedRoster ? (
                  <div className="flex items-center justify-center py-8">
                    <ChurchLoader type="calendar" size="md" text="Loading roster..." />
                  </div>
                ) : (
                  viewType === 'card' ? <FinalizedCardView /> : <FinalizedTableView />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <DeadlineNoticeDialog 
        isOpen={showDeadlineNotice} 
        onClose={() => setShowDeadlineNotice(false)} 
      />
    </div>
  );
}