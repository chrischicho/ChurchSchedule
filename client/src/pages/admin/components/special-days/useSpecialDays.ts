import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SpecialDay } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSpecialDays() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for form dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpecialDay, setEditingSpecialDay] = useState<SpecialDay | null>(null);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [specialDayToDelete, setSpecialDayToDelete] = useState<SpecialDay | null>(null);

  // Fetch all special days
  const {
    data: specialDays,
    isLoading,
    isError,
    error
  } = useQuery<SpecialDay[]>({
    queryKey: ["/api/special-days"],
    refetchOnWindowFocus: false
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newSpecialDay: Omit<SpecialDay, 'id'>) => {
      const response = await fetch('/api/admin/special-days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSpecialDay),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create special day');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-days'] });
      toast({
        title: "Success",
        description: "Special day created successfully",
      });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create special day",
        variant: "destructive",
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<SpecialDay> }) => {
      const response = await fetch(`/api/admin/special-days/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update special day');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-days'] });
      toast({
        title: "Success",
        description: "Special day updated successfully",
      });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update special day",
        variant: "destructive",
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/special-days/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete special day');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-days'] });
      toast({
        title: "Success",
        description: "Special day deleted successfully",
      });
      handleCloseDeleteDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete special day",
        variant: "destructive",
      });
    }
  });

  // Form handlers
  const handleOpenAddForm = () => {
    setEditingSpecialDay(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (specialDay: SpecialDay) => {
    setEditingSpecialDay(specialDay);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSpecialDay(null);
  };

  const handleSubmitForm = (data: any) => {
    if (editingSpecialDay) {
      updateMutation.mutate({ id: editingSpecialDay.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Delete handlers
  const handleOpenDeleteDialog = (specialDay: SpecialDay) => {
    setSpecialDayToDelete(specialDay);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSpecialDayToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (specialDayToDelete) {
      deleteMutation.mutate(specialDayToDelete.id);
    }
  };

  return {
    // Data
    specialDays,
    isLoading,
    isError,
    error,
    
    // Form state
    isFormOpen,
    editingSpecialDay,
    
    // Delete dialog state
    isDeleteDialogOpen,
    specialDayToDelete,
    
    // Form handlers
    handleOpenAddForm,
    handleOpenEditForm,
    handleCloseForm,
    handleSubmitForm,
    
    // Delete handlers
    handleOpenDeleteDialog,
    handleCloseDeleteDialog,
    handleConfirmDelete,
    
    // Mutation states
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}