import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths } from 'date-fns';
import { User, ServiceRole, InsertFinalizedRoster } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Save, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Check, 
  Lock, 
  Calendar as CalendarIcon,
  Send,
  Pencil
} from 'lucide-react';

// Define role maximum limits
const ROLE_LIMITS: Record<string, number> = {
  'Worship Leader': 3,
  'Singer': 4,
  'Keyboardist': 2,
  'Bassist': 1,
  'Guitarist': 1,
  'Drummer': 1,
  'Usher': 2,
  'OBS & Sound': 2,
  'Multimedia': 2,
};
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
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');
  const [selectedAssignments, setSelectedAssignments] = useState<Record<number, number[]>>({}); // Changed to array of user IDs

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
      const initialSelections: Record<number, number[]> = {};
      
      // Group existing assignments by roleId
      selectedSunday.assignments.forEach(assignment => {
        if (!initialSelections[assignment.roleId]) {
          initialSelections[assignment.roleId] = [];
        }
        initialSelections[assignment.roleId].push(assignment.userId);
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

  // Helper function to check if role has reached its maximum limit
  const isRoleFull = (roleId: number, roleName: string) => {
    if (!selectedSunday) return false;
    
    // Get the maximum allowed for this role (default to 1 if not specified)
    const maxAllowed = ROLE_LIMITS[roleName] || 1;
    
    // Count how many of this role are already assigned (existing + pending assignments)
    let assignedCount = 0;
    
    // Count from database assignments
    selectedSunday.assignments.forEach(assignment => {
      if (assignment.roleId === roleId) {
        assignedCount++;
      }
    });
    
    // Count from current selected assignments
    if (selectedAssignments[roleId]) {
      // Add the number of selected users for this role
      // We don't need to worry about duplicates as we're handling that in the assignment logic
      assignedCount += selectedAssignments[roleId].length;
    }
    
    // When we're exactly at the limit, still allow clicking to select
    // The notice will only show when trying to exceed the limit
    return assignedCount > maxAllowed;
  };

  // Handle role assignment
  const handleAssignRole = (roleId: number, userId: number, roleName: string) => {
    // Check if this person is already assigned to this role, and if so, unassign them
    if (selectedAssignments[roleId]?.includes(userId)) {
      setSelectedAssignments(prev => {
        const updated = { ...prev };
        // Filter out this user from the array
        updated[roleId] = updated[roleId].filter(id => id !== userId);
        // If no users left for this role, remove the role entry
        if (updated[roleId].length === 0) {
          delete updated[roleId];
        }
        return updated;
      });
      return;
    }
    
    // Check if this person is already assigned to another role in the selected assignments
    const isAssignedToAnotherRole = Object.entries(selectedAssignments).some(
      ([currentRoleId, userIds]) => 
        parseInt(currentRoleId) !== roleId && userIds.includes(userId)
    );
    
    // Check if this person is already assigned to another role in the database assignments
    const isAssignedInDatabase = selectedSunday?.assignments.some(
      assignment => assignment.userId === userId && assignment.roleId !== roleId
    );
    
    // If person is already assigned to another role, show an error and prevent assignment
    if (isAssignedToAnotherRole || isAssignedInDatabase) {
      toast({
        title: "Person Already Assigned",
        description: "This person is already assigned to another role. A person can only serve in one role per service.",
        variant: "destructive",
      });
      return;
    }
    
    // Get the current count and max limit for this role
    const currentAssignedCount = selectedAssignments[roleId]?.length || 0;
    const existingDatabaseCount = selectedSunday?.assignments.filter(a => a.roleId === roleId).length || 0;
    const totalCurrentCount = currentAssignedCount + existingDatabaseCount;
    const maxLimit = ROLE_LIMITS[roleName] || 1;
    
    // Only show warning when trying to exceed the limit (not when exactly at the limit)
    if (totalCurrentCount >= maxLimit) {
      toast({
        title: `Maximum ${roleName} Limit Exceeded`,
        description: `You can only assign up to ${maxLimit} ${roleName}${maxLimit > 1 ? 's' : ''}. 
                      Please remove an existing ${roleName} before adding a new one.`,
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with assignment
    setSelectedAssignments(prev => {
      const updated = { ...prev };
      if (!updated[roleId]) {
        updated[roleId] = [];
      }
      updated[roleId] = [...updated[roleId], userId];
      return updated;
    });
  };

  // Save all assignments for the selected Sunday
  const handleSaveAssignments = async () => {
    if (!selectedSunday) return;

    // Create an array of all assignments to be made
    const allAssignmentPromises: Promise<any>[] = [];
    
    // Process each role and its assigned users
    Object.entries(selectedAssignments).forEach(([roleId, userIds]) => {
      // For each user ID in the array, create an assignment
      userIds.forEach(userId => {
        // Check if this user is already assigned to this role
        const isExistingAssignment = selectedSunday.assignments.some(
          a => a.roleId === parseInt(roleId) && a.userId === userId
        );
        
        // Skip if already assigned
        if (isExistingAssignment) {
          return;
        }
        
        // Create new assignment
        const promise = createAssignmentMutation.mutateAsync({
          roleId: parseInt(roleId),
          userId,
          serviceDate: selectedSunday.dateStr
        });
        
        allAssignmentPromises.push(promise);
      });
    });

    try {
      // Wait for all assignment operations to complete
      await Promise.all(allAssignmentPromises);
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
        // Let's do a comprehensive check to understand what's happening
        setIsConfirmDialogOpen(false); // Close dialog first
        
        // Ensure we're working with a Date object
        const sundayDate = new Date(selectedSunday.date);
        console.log("Sunday date type:", typeof selectedSunday.date);
        console.log("Sunday date value:", selectedSunday.date);
        console.log("Converted date:", sundayDate);
        
        const year = sundayDate.getFullYear();
        const month = sundayDate.getMonth() + 1; // Adjusting for 0-indexed months
        const day = sundayDate.getDate();
        
        console.log(`=== DEBUG: Clearing assignments for date: ${year}-${month}-${day} ===`);
        console.log("Sunday Data:", selectedSunday);
        console.log("Existing assignments:", selectedSunday.assignments);
        
        // First, check if there are any existing assignments in the database for this date
        // If not, we can just show success without calling the API
        if (selectedSunday.assignments.length === 0 && Object.keys(selectedAssignments).length === 0) {
          console.log("No assignments to clear - skipping API call");
          
          toast({
            title: "No assignments to clear",
            description: "There were no saved assignments for this date.",
          });
          return;
        }
        
        // Now try the deletion API call
        try {
          console.log(`Making DELETE request to: /api/admin/roster-assignments/date/${year}/${month}/${day}`);
          
          // Use fetch directly since apiRequest is giving type errors
          const response = await fetch(`/api/admin/roster-assignments/date/${year}/${month}/${day}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to clear assignments');
          }
          
          const result = await response.json();
          
          console.log("Clear assignments success:", result);
          
          // Update the UI and invalidate caches
          queryClient.invalidateQueries({ 
            queryKey: ['/api/roster-builder/available-sundays', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['/api/roster-assignments/month', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
          });
          
          // Clear selected assignments
          setSelectedAssignments({});
          
          // Show success toast
          toast({
            title: "Assignments cleared",
            description: "All assignments for this date have been removed.",
          });
        } catch (apiError: any) {
          console.error("API Error in clear assignments:", apiError);
          
          // Try to extract nested error information
          const errorMessage = apiError?.message || 
                            apiError?.error?.message || 
                            "Failed to clear assignments";
          
          toast({
            title: "Error clearing assignments",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        // This is for any unexpected errors
        console.error("Unexpected error in clearAssignments:", error);
        console.error("Error stack:", error?.stack);
        
        toast({
          title: "Error clearing assignments",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        setIsConfirmDialogOpen(false);
      }
    }
  };

  // Mutation for finalizing the roster
  const finalizeRosterMutation = useMutation({
    mutationFn: async (data: InsertFinalizedRoster) => {
      const response = await fetch('/api/admin/finalize-roster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to finalize roster');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsFinalizeDialogOpen(false);
      setFinalizeMessage('');
      
      // Invalidate finalized rosters queries to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/finalized-roster'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/finalized-roster', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      
      toast({
        title: "Roster Finalized",
        description: `The roster for ${format(currentMonth, 'MMMM yyyy')} has been finalized and is now available to all members.`,
      });
    },
    onError: (error) => {
      console.error("Error finalizing roster:", error);
      toast({
        title: "Error Finalizing Roster",
        description: error instanceof Error ? error.message : "Failed to finalize the roster. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle opening the finalize dialog
  const handleFinalizeRoster = () => {
    setIsFinalizeDialogOpen(true);
  };

  // Handle submitting the finalize roster request
  const handleSubmitFinalize = async () => {
    // Create finalize roster data
    const finalizeData: InsertFinalizedRoster = {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1, // Convert from 0-indexed to 1-indexed
      createdBy: 1, // Assuming the current user's ID (should be replaced with actual user ID)
      isFinalized: true,
      finalizedBy: 1, // Same as createdBy
      message: finalizeMessage || undefined, // Only include if there's a message
    };

    // Submit the data
    finalizeRosterMutation.mutate(finalizeData);
  };
  
  // Mutation for revoking the finalized status
  const reviseRosterMutation = useMutation({
    mutationFn: async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // Convert from 0-indexed to 1-indexed
      
      const response = await fetch(`/api/admin/finalize-roster/${year}/${month}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revise roster');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate finalized rosters queries to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/finalized-roster'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/finalized-roster', currentMonth.getFullYear(), currentMonth.getMonth() + 1] 
      });
      
      toast({
        title: "Roster Available for Revision",
        description: `The roster for ${format(currentMonth, 'MMMM yyyy')} can now be edited again.`,
      });
    },
    onError: (error) => {
      console.error("Error revising roster:", error);
      toast({
        title: "Error Revising Roster",
        description: error instanceof Error ? error.message : "Failed to revise the roster. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle revising the roster (unfinalize)
  const handleReviseRoster = () => {
    reviseRosterMutation.mutate();
  };

  // Check if there's any existing finalized roster for this month
  const { data: finalizedRoster, isLoading: isFinalizedRosterLoading } = useQuery({
    queryKey: ['/api/finalized-roster', currentMonth.getFullYear(), currentMonth.getMonth() + 1],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/finalized-roster/${currentMonth.getFullYear()}/${currentMonth.getMonth() + 1}`, {
          credentials: 'include'
        });
        
        if (response.status === 404) {
          return null; // No finalized roster yet
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch finalized roster status');
        }
        
        return response.json();
      } catch (error) {
        console.error("Error checking finalized status:", error);
        return null;
      }
    },
    // Don't throw on error, just return null
    retry: false
  });

  // Check if a roster record exists and if it's currently finalized
  const rosterExists = finalizedRoster !== null && finalizedRoster !== undefined;
  const isRosterFinalized = rosterExists && finalizedRoster.isFinalized === true;

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

  // Finalize roster confirmation dialog
  const FinalizeRosterDialog = () => (
    <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalize Roster for {format(currentMonth, 'MMMM yyyy')}</DialogTitle>
          <DialogDescription>
            Finalizing the roster will make it visible to all members. This should be done when all assignments for the month are completed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Optional Message (visible to members)
            </label>
            <textarea
              id="message"
              value={finalizeMessage}
              onChange={(e) => setFinalizeMessage(e.target.value)}
              placeholder="Add any notes about this month's roster..."
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-transparent ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitFinalize} 
            disabled={finalizeRosterMutation.isPending}
          >
            {finalizeRosterMutation.isPending ? (
              <>
                <ChurchLoader type="church" size="xs" className="mr-2" />
                Finalizing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Finalize Roster
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold mb-4">Roster Builder</h2>

      {/* Add roster status alert - different versions based on finalization status */}
      {rosterExists && (
        <>
          {isRosterFinalized ? (
            <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="flex-1 ml-3">
                <h4 className="font-medium text-green-800 dark:text-green-300">Roster Finalized</h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  The roster for {format(currentMonth, 'MMMM yyyy')} has been finalized and is available to all members.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReviseRoster}
                disabled={reviseRosterMutation.isPending}
                className="border-green-300 text-green-700 hover:text-green-800 hover:bg-green-100 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                {reviseRosterMutation.isPending ? (
                  <>
                    <ChurchLoader type="church" size="xs" className="mr-2" />
                    Revising...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Revise Roster
                  </>
                )}
              </Button>
            </Alert>
          ) : (
            <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 ml-3">
                <h4 className="font-medium text-amber-800 dark:text-amber-300">Roster in Draft Mode</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This roster was previously finalized but is now in draft mode. Make your changes and finalize it again when ready.
                </p>
              </div>
            </Alert>
          )}
        </>
      )}

      {/* Month selector header with Finalize button - Top row */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="font-medium text-lg">Available Sundays</h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePreviousMonth}
            className="px-2 sm:px-3"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <span className="font-medium whitespace-nowrap">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleNextMonth}
            className="px-2 sm:px-3"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Finalize button */}
          <Button
            size="sm"
            variant={isRosterFinalized ? "outline" : "default"}
            onClick={handleFinalizeRoster}
            disabled={isRosterFinalized || sundaysData?.length === 0}
            className="ml-2"
          >
            {isRosterFinalized ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Finalized
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-1" />
                {rosterExists && !isRosterFinalized ? "Re-Finalize Roster" : "Finalize Roster"}
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Finalize Roster Dialog */}
      <FinalizeRosterDialog />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left panel - Available Sundays */}
        <div className="md:col-span-1">
          
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
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{role.name}</h4>
                              {/* Display role limit info */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant={isRoleFull(role.id, role.name) ? "destructive" : "outline"} 
                                      className="text-xs py-0 h-5"
                                    >
                                      {isRoleFull(role.id, role.name) ? (
                                        <>Max {ROLE_LIMITS[role.name] || 1}</>
                                      ) : (
                                        <>Limit: {ROLE_LIMITS[role.name] || 1}</>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Maximum {ROLE_LIMITS[role.name] || 1} {role.name}{ROLE_LIMITS[role.name] > 1 ? "s" : ""} allowed per service
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
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
                        
                        {/* The role limit indicator is no longer shown by default, 
                            it will only be shown via a toast when the user tries to exceed the limit */}
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                          {selectedSunday.availablePeople.map(person => {
                            // Check if person is already assigned to another role
                            const isAssignedElsewhere = selectedSunday.assignments.some(a => a.userId === person.id && a.roleId !== role.id) || 
                                                      Object.entries(selectedAssignments).some(([otherRoleId, userIds]) => 
                                                        parseInt(otherRoleId) !== role.id && userIds.includes(person.id));
                                                        
                            if (isAssignedElsewhere) {
                              return (
                                <TooltipProvider key={`${role.id}-${person.id}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="border rounded-md p-2 text-sm opacity-50 cursor-not-allowed relative"
                                      >
                                        <p className="font-medium truncate">{person.formattedName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{person.initials}</p>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">This person is already assigned to another role. Each person can only serve in one role per service.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            } else {
                              return (
                                <div
                                  key={`${role.id}-${person.id}`}
                                  className={`
                                    border rounded-md p-2 text-sm cursor-pointer relative
                                    ${selectedAssignments[role.id]?.includes(person.id) ? 'bg-primary/20 border-primary' : 'hover:bg-muted/50'}
                                  `}
                                  onClick={() => handleAssignRole(role.id, person.id, role.name)}
                                >
                                  <p className="font-medium truncate">{person.formattedName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{person.initials}</p>
                                </div>
                              );
                            }
                          })}
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