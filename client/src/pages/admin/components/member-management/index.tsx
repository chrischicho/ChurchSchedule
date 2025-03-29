import { MembersList } from "./MembersList";
import { NameDialog } from "./NameDialog";
import { InitialsDialog } from "./InitialsDialog";
import { useMemberManagement } from "./useMemberManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { User } from "@shared/schema";

export function MemberManagement() {
  const {
    // Data
    members,
    isLoading,
    
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
    
    // Delete handler and state
    handleDeleteMember,
    isDeleting,
    
    // Mutation states
    isUpdatingName,
    isUpdatingInitials
  } = useMemberManagement();

  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  // Delete dialog handlers
  const handleOpenDeleteDialog = (id: number) => {
    const member = members?.find(m => m.id === id) || null;
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      handleDeleteMember(memberToDelete.id);
      handleCloseDeleteDialog();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Management</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Members List Component */}
        <MembersList
          members={members}
          isLoading={isLoading}
          onEditName={handleOpenNameDialog}
          onEditInitials={handleOpenInitialsDialog}
          onDelete={handleOpenDeleteDialog}
          isDeleting={isDeleting}
        />
        
        {/* Name Edit Dialog */}
        <NameDialog
          isOpen={isNameDialogOpen}
          onClose={handleCloseNameDialog}
          member={selectedMember}
          onSubmit={handleSubmitNameUpdate}
          isSubmitting={isUpdatingName}
        />
        
        {/* Initials Edit Dialog */}
        <InitialsDialog
          isOpen={isInitialsDialogOpen}
          onClose={handleCloseInitialsDialog}
          member={memberForInitials}
          onSubmit={handleSubmitInitialsUpdate}
          isSubmitting={isUpdatingInitials}
        />
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {memberToDelete?.firstName} {memberToDelete?.lastName}? 
                This will remove them from all rosters and availability data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}