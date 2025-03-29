import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SpecialDay } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Custom hook to manage Special Days CRUD operations
 */
export function useSpecialDays() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Fetch all special days
  const { 
    data: allSpecialDays, 
    isLoading, 
    isError 
  } = useQuery<SpecialDay[]>({
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

  // Filter special days based on view mode
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

  // Mutation for creating a special day
  const createSpecialDayMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest({
        method: "POST",
        data
      }, "/api/admin/special-days");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
      queryClient.invalidateQueries({ queryKey: ["/api/special-days/month"] });
      
      toast({
        title: "Success",
        description: "Special day added successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating special day:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a special day
  const updateSpecialDayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest({
        method: "PATCH",
        data
      }, `/api/admin/special-days/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
      queryClient.invalidateQueries({ queryKey: ["/api/special-days/month"] });
      
      toast({
        title: "Success",
        description: "Special day updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating special day:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a special day
  const deleteSpecialDayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest({
        method: "DELETE"
      }, `/api/admin/special-days/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
      
      toast({
        title: "Success",
        description: "Special day deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to format the date for API submission
  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Return the hook API
  return {
    // Data
    specialDays,
    isLoading,
    isError,
    
    // View state
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    
    // Mutations
    createSpecialDay: (data: any) => createSpecialDayMutation.mutate(data),
    updateSpecialDay: (id: number, data: any) => updateSpecialDayMutation.mutate({ id, data }),
    deleteSpecialDay: (id: number) => deleteSpecialDayMutation.mutate(id),
    
    // Mutation states
    isCreating: createSpecialDayMutation.isPending,
    isUpdating: updateSpecialDayMutation.isPending,
    isDeleting: deleteSpecialDayMutation.isPending,
    
    // Helpers
    formatDateForApi,
    hasSpecialDays: !!specialDays?.length,
    getEmptyMessage: () => viewMode === 'month' 
      ? `No special days marked for ${format(selectedMonth, "MMMM yyyy")}`
      : "No special days have been created yet"
  };
}