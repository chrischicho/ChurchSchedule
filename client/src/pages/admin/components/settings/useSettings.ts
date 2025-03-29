import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, NameFormat, deadlineDaySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current settings
  const {
    data: settings,
    isLoading,
    isError,
    error
  } = useQuery<Settings>({
    queryKey: ["/api/admin/settings"],
    refetchOnWindowFocus: false
  });

  // Update name format mutation
  const updateNameFormatMutation = useMutation({
    mutationFn: async (format: NameFormat) => {
      const response = await fetch('/api/admin/name-format', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update name format');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "Success",
        description: "Name format updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update name format",
        variant: "destructive",
      });
    }
  });

  // Update deadline day mutation
  const updateDeadlineMutation = useMutation({
    mutationFn: async (deadlineDay: number) => {
      // Validate deadline day
      const parsedDay = deadlineDaySchema.parse(deadlineDay);

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deadlineDay: parsedDay }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update deadline day');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "Success",
        description: "Availability deadline updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update deadline day",
        variant: "destructive",
      });
    }
  });

  // Name format change handler
  const handleNameFormatChange = (format: NameFormat) => {
    updateNameFormatMutation.mutate(format);
  };

  // Deadline day change handler
  const handleDeadlineDayChange = (day: number) => {
    updateDeadlineMutation.mutate(day);
  };

  return {
    // Data
    settings,
    isLoading,
    isError,
    error,
    
    // Handlers
    handleNameFormatChange,
    handleDeadlineDayChange,
    
    // Mutation states
    isUpdatingNameFormat: updateNameFormatMutation.isPending,
    isUpdatingDeadline: updateDeadlineMutation.isPending
  };
}