import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths } from 'date-fns';
import { User, ServiceRole } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { ChevronLeft, ChevronRight, Trash2, Save, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoaderOverlay } from './loader-overlay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChurchLoader } from './church-loader';

type SundayData = {
  date: Date;
  dateStr: string;
  formattedDate: string;
  availablePeople: (User & { formattedName: string })[];
  assignments: any[];
  specialDay?: any;
  roles: ServiceRole[];
};

export function RosterBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedSunday, setSelectedSunday] = useState<SundayData | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<Record<number, number>>({});

  // Get available Sundays with people
  const {
    data: sundaysData,
    isLoading: isSundaysLoading,
    error: sundaysError
  } = useQuery({
    queryKey: ['/api/roster-builder/available-sundays', currentMonth.getFullYear(), currentMonth.getMonth() + 1],
    queryFn: async () => {
      const response = await fetch(`/api/roster-builder/available-sundays/${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available Sundays');
      }
      
      return response.json();
    }
  });

  // Mutation for creating roster assignments
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { roleId: number; userId: number; serviceDate: string }) => {
      const response = await fetch('/api/admin/roster-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/roster-builder/available-sundays', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/roster-assignments/month', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      toast({
        title: "Assignment saved",
        description: "The roster assignment has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating roster assignment:", error);
      toast({
        title: "Error saving assignment",
        description: error instanceof Error ? error.message : "Failed to create roster assignment",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting all assignments for a date
  const clearDateAssignmentsMutation = useMutation({
    mutationFn: async (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // Adjusting for 0-indexed months
      const day = date.getDate();
      
      console.log(`Clearing assignments for date: ${year}-${month}-${day}`);
      
      const response = await fetch(`/api/admin/roster-assignments/date/${year}/${month}/${day}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      // Try to parse the response regardless of status
      let responseData;
      try {
        responseData = await response.json();
        console.log("Response data:", responseData);
      } catch (parseError) {
        console.log("No JSON response body");
      }
      
      // Check if response was successful
      if (!response.ok) {
        const errorMessage = responseData?.message || 'Failed to clear assignments';
        console.error("Error in response:", errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseData || true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/roster-builder/available-sundays', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/roster-assignments/month', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      setSelectedAssignments({});
      toast({
        title: "Assignments cleared",
        description: "All assignments for this date have been removed.",
      });
      setIsConfirmDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error clearing assignments:", error);
      toast({
        title: "Error clearing assignments",
        description: "Failed to clear the assignments for this date.",
        variant: "destructive",
      });
      setIsConfirmDialogOpen(false);
    }
  });

  // Reset selections when changing selected Sunday
  useEffect(() => {
    if (selectedSunday) {
      // Initialize selections based on existing assignments
      const initialSelections: Record<number, number> = {};
      
      selectedSunday.assignments.forEach(assignment => {
        initialSelections[assignment.roleId] = assignment.userId;
      });
      
      setSelectedAssignments(initialSelections);
    } else {
      setSelectedAssignments({});
    }
  }, [selectedSunday]);

  // Navigate between months
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
    setSelectedSunday(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
    setSelectedSunday(null);
  };

  // Handle role assignment
  const handleAssignRole = (roleId: number, userId: number) => {
    setSelectedAssignments(prev => ({
      ...prev,
      [roleId]: userId
    }));
  };

  // Save all assignments for the selected Sunday
  const handleSaveAssignments = async () => {
    if (!selectedSunday) return;

    // Convert to array of promises for each assignment
    const assignmentPromises = Object.entries(selectedAssignments).map(
      async ([roleId, userId]) => {
        // Check if this is a change from existing assignments
        const existingAssignment = selectedSunday.assignments.find(
          a => a.roleId === parseInt(roleId)
        );

        // If same user already assigned, skip
        if (existingAssignment && existingAssignment.userId === userId) {
          return null;
        }

        // Create new assignment
        return createAssignmentMutation.mutateAsync({
          roleId: parseInt(roleId),
          userId,
          serviceDate: selectedSunday.dateStr
        });
      }
    );

    try {
      // Wait for all assignment operations to complete
      await Promise.all(assignmentPromises.filter(Boolean));
      toast({
        title: "Roster saved",
        description: "All assignments have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving roster:", error);
      toast({
        title: "Error saving roster",
        description: "Some assignments could not be saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle clearing all assignments for a date
  const handleClearAssignments = () => {
    setIsConfirmDialogOpen(true);
  };

  const confirmClearAssignments = async () => {
    if (selectedSunday) {
      try {
        // Try manual fetch first to see if we can get more error details
        const year = selectedSunday.date.getFullYear();
        const month = selectedSunday.date.getMonth() + 1; // Adjusting for 0-indexed months
        const day = selectedSunday.date.getDate();
        
        console.log(`Manually clearing assignments for date: ${year}-${month}-${day}`);
        
        const response = await fetch(`/api/admin/roster-assignments/date/${year}/${month}/${day}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log("Response status:", response.status);
        console.log("Response status text:", response.statusText);
        
        // Check response headers
        const contentType = response.headers.get('content-type');
        console.log("Content-Type:", contentType);
        
        if (response.ok) {
          // If the response is successful, try to read the body if there is one
          if (contentType && contentType.includes('application/json')) {
            const jsonData = await response.json();
            console.log("Response data:", jsonData);
          } else {
            console.log("No JSON response body");
          }
          
          // Manually update the UI and cache
          queryClient.invalidateQueries({ 
            queryKey: ['/api/roster-builder/available-sundays', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['/api/roster-assignments/month', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
          });
          setSelectedAssignments({});
          toast({
            title: "Assignments cleared",
            description: "All assignments for this date have been removed.",
          });
          setIsConfirmDialogOpen(false);
        } else {
          // If there was an error, try to read error details
          let errorMessage = "Failed to clear assignments";
          try {
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            }
          } catch (e) {
            console.error("Error parsing error response:", e);
          }
          
          console.error("Error clearing assignments:", errorMessage);
          toast({
            title: "Error clearing assignments",
            description: errorMessage,
            variant: "destructive",
          });
          setIsConfirmDialogOpen(false);
        }
      } catch (error) {
        // This is for network errors or other exceptions
        console.error("Exception in manual clear:", error);
        toast({
          title: "Error clearing assignments",
          description: "A network error occurred. Please try again.",
          variant: "destructive",
        });
        setIsConfirmDialogOpen(false);
      }
    }
  };

  if (isSundaysLoading) {
    return <LoaderOverlay isLoading={true} type="calendar" loadingText="Loading roster data..." />;
  }

  if (sundaysError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading roster data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Roster Builder</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleNextMonth}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left panel - Available Sundays */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-medium text-lg">Available Sundays</h3>
          
          {sundaysData && sundaysData.length > 0 ? (
            <div className="space-y-2">
              {Array.isArray(sundaysData) && sundaysData.map((sunday: SundayData) => (
                <Card 
                  key={sunday.dateStr}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedSunday?.dateStr === sunday.dateStr ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedSunday(sunday)}
                >
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-medium">{format(new Date(sunday.date), 'MMMM d, yyyy')}</CardTitle>
                    <CardDescription className="text-xs">
                      {sunday.specialDay ? (
                        <Badge 
                          style={{
                            backgroundColor: sunday.specialDay.color || '#7C3AED',
                            color: '#FFFFFF'
                          }}
                        >
                          {sunday.specialDay.name}
                        </Badge>
                      ) : 'Regular Sunday'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <p className="text-xs text-muted-foreground">
                      {sunday.availablePeople.length} people available
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sunday.assignments.length} of {sunday.roles.length} roles assigned
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 text-center">
                <Info className="h-12 w-12 mx-auto text-muted-foreground opacity-50 my-4" />
                <p className="text-sm">No Sundays found with available people in this month.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try another month or check if members have indicated their availability.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right panel - Assignment details */}
        <div className="md:col-span-2">
          {selectedSunday ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{format(new Date(selectedSunday.date), 'MMMM d, yyyy')}</CardTitle>
                    <CardDescription>
                      {selectedSunday.specialDay ? (
                        <Badge 
                          style={{
                            backgroundColor: selectedSunday.specialDay.color || '#7C3AED',
                            color: '#FFFFFF'
                          }}
                        >
                          {selectedSunday.specialDay.name}
                        </Badge>
                      ) : 'Regular Sunday'}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleClearAssignments}
                      disabled={selectedSunday.assignments.length === 0 && Object.keys(selectedAssignments).length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAssignments}
                      disabled={Object.keys(selectedAssignments).length === 0}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium mb-2">Assign People to Roles</h3>
                
                {selectedSunday.roles.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSunday.roles.map(role => (
                      <div key={role.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h4 className="font-medium">{role.name}</h4>
                            {role.description && (
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center h-6">
                                  {selectedAssignments[role.id] && (
                                    <Badge variant="outline" className="mr-2">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Click a person to assign them to this role</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                          {selectedSunday.availablePeople.map(person => (
                            <div
                              key={`${role.id}-${person.id}`}
                              className={`
                                border rounded-md p-2 text-sm cursor-pointer
                                ${selectedAssignments[role.id] === person.id ? 'bg-primary/20 border-primary' : 'hover:bg-muted/50'}
                                ${selectedSunday.assignments.some(a => a.userId === person.id && a.roleId !== role.id) ? 'opacity-50' : ''}
                              `}
                              onClick={() => handleAssignRole(role.id, person.id)}
                            >
                              <p className="font-medium truncate">{person.formattedName}</p>
                              <p className="text-xs text-muted-foreground truncate">{person.initials}</p>
                            </div>
                          ))}
                        </div>
                        
                        {selectedSunday.availablePeople.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-2">No people available for this date.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No service roles found. Please add service roles in the settings tab.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Note: People already assigned to other roles are shown with reduced opacity.
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ChurchLoader type="calendar" size="lg" className="mx-auto text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">Select a Sunday to create roster assignments</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You'll be able to assign available people to service roles for that date
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Assignments</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all role assignments for {selectedSunday ? format(new Date(selectedSunday.date), 'MMMM d, yyyy') : 'this date'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmClearAssignments}>
              Clear Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Loading overlay for mutations */}
      <LoaderOverlay 
        isLoading={createAssignmentMutation.isPending || clearDateAssignmentsMutation.isPending} 
        loadingText={createAssignmentMutation.isPending ? "Saving assignments..." : "Clearing assignments..."}
        type="calendar"
      />
    </div>
  );
}