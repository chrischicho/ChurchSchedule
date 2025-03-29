import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, CustomInitials, UpdateMemberName } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMemberManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for name update dialog
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  
  // State for initials update dialog
  const [isInitialsDialogOpen, setIsInitialsDialogOpen] = useState(false);
  const [memberForInitials, setMemberForInitials] = useState<User | null>(null);

  // Fetch all members
  const {
    data: members,
    isLoading,
    isError,
    error
  } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
    refetchOnWindowFocus: false
  });

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UpdateMemberName }) => {
      const response = await fetch(`/api/admin/members/${id}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update member name');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });
      toast({
        title: "Success",
        description: "Member name updated successfully",
      });
      handleCloseNameDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member name",
        variant: "destructive",
      });
    }
  });

  // Update initials mutation
  const updateInitialsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: CustomInitials }) => {
      const response = await fetch(`/api/admin/members/${id}/initials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update member initials');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });
      toast({
        title: "Success",
        description: "Member initials updated successfully",
      });
      handleCloseInitialsDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member initials",
        variant: "destructive",
      });
    }
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/members/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete member');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete member",
        variant: "destructive",
      });
    }
  });

  // Name dialog handlers
  const handleOpenNameDialog = (member: User) => {
    setSelectedMember(member);
    setIsNameDialogOpen(true);
  };

  const handleCloseNameDialog = () => {
    setIsNameDialogOpen(false);
    setSelectedMember(null);
  };

  const handleSubmitNameUpdate = (data: UpdateMemberName) => {
    if (selectedMember) {
      updateNameMutation.mutate({ id: selectedMember.id, data });
    }
  };

  // Initials dialog handlers
  const handleOpenInitialsDialog = (member: User) => {
    setMemberForInitials(member);
    setIsInitialsDialogOpen(true);
  };

  const handleCloseInitialsDialog = () => {
    setIsInitialsDialogOpen(false);
    setMemberForInitials(null);
  };

  const handleSubmitInitialsUpdate = (data: CustomInitials) => {
    if (memberForInitials) {
      updateInitialsMutation.mutate({ id: memberForInitials.id, data });
    }
  };

  // Delete member handler
  const handleDeleteMember = (id: number) => {
    deleteMemberMutation.mutate(id);
  };

  return {
    // Data
    members,
    isLoading,
    isError,
    error,
    
    // Name dialog state
    isNameDialogOpen,
    selectedMember,
    
    // Initials dialog state
    isInitialsDialogOpen,
    memberForInitials,
    
    // Name dialog handlers
    handleOpenNameDialog,
    handleCloseNameDialog,
    handleSubmitNameUpdate,
    
    // Initials dialog handlers
    handleOpenInitialsDialog,
    handleCloseInitialsDialog,
    handleSubmitInitialsUpdate,
    
    // Delete handler
    handleDeleteMember,
    
    // Mutation states
    isUpdatingName: updateNameMutation.isPending,
    isUpdatingInitials: updateInitialsMutation.isPending,
    isDeleting: deleteMemberMutation.isPending
  };
}