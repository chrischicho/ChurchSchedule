import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ServiceRole } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoaderOverlay } from './loader-overlay';

// Define the form schema
const serviceRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ServiceRoleFormValues = z.infer<typeof serviceRoleSchema>;

export function ServiceRolesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ServiceRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<ServiceRole | null>(null);

  // Fetch service roles
  const {
    data: serviceRoles,
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/service-roles'],
    queryFn: async () => {
      const response = await fetch('/api/service-roles', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch service roles');
      }
      
      return response.json();
    },
  });

  // Form setup
  const form = useForm<ServiceRoleFormValues>({
    resolver: zodResolver(serviceRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: ServiceRoleFormValues) => {
      const response = await fetch('/api/admin/service-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create service role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-roles'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Role created",
        description: "The service role has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating service role:", error);
      toast({
        title: "Error creating role",
        description: error instanceof Error ? error.message : "Failed to create service role",
        variant: "destructive",
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<ServiceRoleFormValues> }) => {
      const response = await fetch(`/api/admin/service-roles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update service role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-roles'] });
      setIsDialogOpen(false);
      setEditingRole(null);
      form.reset();
      toast({
        title: "Role updated",
        description: "The service role has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating service role:", error);
      toast({
        title: "Error updating role",
        description: error instanceof Error ? error.message : "Failed to update service role",
        variant: "destructive",
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-roles/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete service role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-roles'] });
      setRoleToDelete(null);
      toast({
        title: "Role deleted",
        description: "The service role has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting service role:", error);
      toast({
        title: "Error deleting role",
        description: error instanceof Error ? error.message : "Failed to delete service role",
        variant: "destructive",
      });
    }
  });

  // Reorder roles mutation
  const reorderRolesMutation = useMutation({
    mutationFn: async (roleIds: number[]) => {
      return apiRequest('/api/admin/service-roles/reorder', {
        method: 'POST',
        body: JSON.stringify({ roleIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-roles'] });
      toast({
        title: "Roles reordered",
        description: "The service roles have been reordered successfully.",
      });
    },
    onError: (error) => {
      console.error("Error reordering service roles:", error);
      toast({
        title: "Error reordering roles",
        description: error instanceof Error ? error.message : "Failed to reorder service roles",
        variant: "destructive",
      });
      // Refresh to revert to original order
      queryClient.invalidateQueries({ queryKey: ['/api/service-roles'] });
    }
  });

  // Handle form submission
  const onSubmit = (data: ServiceRoleFormValues) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditClick = (role: ServiceRole) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      description: role.description || '',
      is_active: role.isActive,
    });
    setIsDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (role: ServiceRole) => {
    setRoleToDelete(role);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
    }
  };

  // Handle dialog open
  const handleDialogOpen = (open: boolean) => {
    if (!open) {
      setEditingRole(null);
      form.reset({
        name: '',
        description: '',
        is_active: true,
      });
    }
    setIsDialogOpen(open);
  };

  // Handle drag end for reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination || !serviceRoles) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // Create a copy of the service roles array
    const reorderedRoles = [...serviceRoles];
    
    // Remove the item from its original position
    const [removed] = reorderedRoles.splice(sourceIndex, 1);
    
    // Insert it at the new position
    reorderedRoles.splice(destinationIndex, 0, removed);
    
    // Generate an array of role IDs in the new order
    const reorderedIds = reorderedRoles.map(role => role.id);
    
    // Send the update to the backend
    reorderRolesMutation.mutate(reorderedIds);
  };

  if (isLoading) {
    return <LoaderOverlay isLoading={true} loadingText="Loading service roles..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>
          Error loading service roles. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const isUpdating = 
    createRoleMutation.isPending || 
    updateRoleMutation.isPending || 
    deleteRoleMutation.isPending ||
    reorderRolesMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Service Roles</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Service Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceRoles && serviceRoles.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="service-roles">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {serviceRoles.map((role, index) => (
                      <Draggable key={role.id} draggableId={role.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              border rounded-md p-3 flex justify-between items-center
                              ${!role.isActive ? 'opacity-50 bg-muted/50' : ''}
                            `}
                          >
                            <div className="flex items-center">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab mr-3 p-1 hover:bg-muted rounded"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{role.name}</p>
                                {role.description && (
                                  <p className="text-sm text-muted-foreground">{role.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!role.isActive && (
                                <span className="text-xs bg-muted px-2 py-1 rounded-md">
                                  Inactive
                                </span>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditClick(role)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteClick(role)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No service roles found. Click "Add Role" to create your first service role.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Service Role' : 'Add Service Role'}</DialogTitle>
            <DialogDescription>
              {editingRole 
                ? 'Update the details for this service role.' 
                : 'Create a new service role for your church roster.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Worship Leader" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the service role.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the role responsibilities"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      A short description of what this role entails.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Active
                      </FormLabel>
                      <FormDescription>
                        Inactive roles won't appear in the roster builder.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
                  {createRoleMutation.isPending || updateRoleMutation.isPending ? (
                    <>Saving...</>
                  ) : (
                    <>{editingRole ? 'Update' : 'Create'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{roleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteRoleMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading overlay */}
      <LoaderOverlay isLoading={isUpdating} loadingText="Updating service roles..." />
    </div>
  );
}