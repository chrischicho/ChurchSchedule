import { useState } from "react";
import { useSpecialDays } from "../hooks/useSpecialDays";
import { ViewControls } from "./ViewControls";
import { SpecialDaysTable } from "./SpecialDaysTable";
import { SpecialDayDialog } from "./SpecialDayDialog";
import { SpecialDay } from "@shared/schema";
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
import { ChurchLoader } from "@/components/church-loader";

/**
 * Main container component for managing special days
 */
export function SpecialDaysManager() {
  const {
    specialDays,
    isLoading,
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    createSpecialDay,
    updateSpecialDay,
    deleteSpecialDay,
    isCreating,
    isUpdating,
    isDeleting,
    formatDateForApi,
    hasSpecialDays,
    getEmptyMessage
  } = useSpecialDays();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSpecialDay, setSelectedSpecialDay] = useState<SpecialDay | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [specialDayToDelete, setSpecialDayToDelete] = useState<SpecialDay | undefined>(undefined);

  // Dialog handlers
  const openAddDialog = () => {
    setSelectedSpecialDay(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (specialDay: SpecialDay) => {
    setSelectedSpecialDay(specialDay);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  
  const openDeleteConfirm = (specialDay: SpecialDay) => {
    setSpecialDayToDelete(specialDay);
    setDeleteConfirmOpen(true);
  };

  // Form submission handlers
  const handleSubmit = (data: any) => {
    if (selectedSpecialDay) {
      // Update existing special day
      updateSpecialDay(selectedSpecialDay.id, data);
    } else {
      // Create new special day
      createSpecialDay(data);
    }
    closeDialog();
  };
  
  const handleDelete = () => {
    if (specialDayToDelete) {
      deleteSpecialDay(specialDayToDelete.id);
      setDeleteConfirmOpen(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <ChurchLoader type="calendar" size="md" text="Loading special days..." />
      </div>
    );
  }

  // Empty state
  if (!hasSpecialDays) {
    return (
      <>
        <ViewControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          onAdd={openAddDialog}
        />
        <div className="text-center p-4 border rounded-md bg-muted/10">
          <p className="text-muted-foreground">
            {getEmptyMessage()}
          </p>
        </div>
        <SpecialDayDialog
          isOpen={isDialogOpen}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          isSubmitting={isCreating || isUpdating}
          formatDateForApi={formatDateForApi}
        />
      </>
    );
  }

  // Main view
  return (
    <>
      <ViewControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onAdd={openAddDialog}
      />
      
      <SpecialDaysTable
        specialDays={specialDays || []}
        onEdit={openEditDialog}
        onDelete={openDeleteConfirm}
      />
      
      <SpecialDayDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        specialDay={selectedSpecialDay}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
        formatDateForApi={formatDateForApi}
      />
      
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the special day "{specialDayToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}