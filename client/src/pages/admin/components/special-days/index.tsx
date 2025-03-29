import { SpecialDaysList } from "./SpecialDaysList";
import { SpecialDayForm } from "./SpecialDayForm";
import { useSpecialDays } from "./useSpecialDays";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SpecialDaysManager() {
  const {
    // Data
    specialDays,
    isLoading,
    isError,
    
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
    isSubmitting,
    isDeleting
  } = useSpecialDays();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Days</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Special Days List Component */}
        <SpecialDaysList
          onEdit={handleOpenEditForm}
          onDelete={handleOpenDeleteDialog}
        />
        
        {/* Special Day Form Dialog */}
        <SpecialDayForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          specialDay={editingSpecialDay}
          onSubmit={handleSubmitForm}
          isSubmitting={isSubmitting}
        />
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Special Day</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {specialDayToDelete?.name}? This action cannot be undone.
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