import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addMonths, subMonths } from "date-fns";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, SpecialDay } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, Mail, Settings, Calendar as CalendarIcon, Plus, Edit, Star } from "lucide-react";

// Form schema for special days
const specialDaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#FFD700")
});

type SpecialDayFormValues = z.infer<typeof specialDaySchema>;

// Component to display the list of special days
function SpecialDaysList({ 
  currentMonth, 
  onEdit, 
  onDelete 
}: { 
  currentMonth: Date; 
  onEdit: (specialDay: SpecialDay) => void; 
  onDelete: (specialDay: SpecialDay) => void; 
}) {
  // Get the year and month from the selected date
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1; // JavaScript months are 0-based
  
  const { data: specialDays, isLoading, isError } = useQuery<SpecialDay[]>({
    queryKey: ["/api/special-days/month", year, month],
    queryFn: async () => {
      try {
        console.log(`Fetching special days for year=${year}, month=${month}`);
        
        const response = await fetch(`/api/special-days/month?year=${year}&month=${month}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Error response: ${response.status} ${response.statusText}`, errorData);
          throw new Error(`Error fetching special days: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Successfully fetched ${data?.length || 0} special days`);
        return data || [];
      } catch (error) {
        console.error("Error fetching special days:", error);
        // Return empty array instead of throwing to prevent component from crashing
        return [];
      }
    },
    // Don't refetch on window focus to avoid unnecessary requests
    refetchOnWindowFocus: false,
    // Always treat the response as fresh data
    staleTime: 0
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!specialDays?.length) {
    return (
      <div className="text-center p-4 border rounded-md bg-muted/10">
        <p className="text-muted-foreground">No special days marked for {format(currentMonth, "MMMM yyyy")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Color</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {specialDays.map((specialDay) => (
            <tr key={specialDay.id} className="border-b">
              <td className="p-3">{format(new Date(specialDay.date), "MMMM d, yyyy")}</td>
              <td className="p-3 font-medium">{specialDay.name}</td>
              <td className="p-3 text-muted-foreground">{specialDay.description || "-"}</td>
              <td className="p-3">
                <div className="flex items-center">
                  <div 
                    className="w-5 h-5 rounded-full mr-2" 
                    style={{ backgroundColor: specialDay.color }} 
                  />
                  {specialDay.color}
                </div>
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEdit(specialDay)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onDelete(specialDay)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Component for the special day dialog (add/edit)
function SpecialDayDialog({ 
  isOpen, 
  onClose, 
  specialDay,
  createMutation,
  updateMutation
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  specialDay: SpecialDay | null;
  createMutation: any;
  updateMutation: any;
}) {
  const { toast } = useToast();
  const isEditing = !!specialDay;
  
  const form = useForm<SpecialDayFormValues>({
    resolver: zodResolver(specialDaySchema),
    defaultValues: isEditing 
      ? {
          date: new Date(specialDay.date),
          name: specialDay.name,
          description: specialDay.description || '',
          color: specialDay.color
        }
      : {
          date: new Date(),
          name: '',
          description: '',
          color: '#FFD700' // Default gold color
        }
  });
  
  // Reset the form when the dialog opens/closes or when editing a different special day
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        form.reset({
          date: new Date(specialDay.date),
          name: specialDay.name,
          description: specialDay.description || '',
          color: specialDay.color
        });
      } else {
        form.reset({
          date: new Date(),
          name: '',
          description: '',
          color: '#FFD700'
        });
      }
    }
  }, [form, isOpen, isEditing, specialDay]);
  
  const handleSubmit = async (data: SpecialDayFormValues) => {
    try {
      if (form.formState.isSubmitting) return;
      
      console.log(`Submitting special day data:`, JSON.stringify(data));
      
      // Make sure date is properly formatted (ISO string for database)
      const formattedData = {
        ...data,
        date: data.date.toISOString().split('T')[0]
      };
      
      console.log('Formatted data:', formattedData);
      
      if (isEditing && specialDay) {
        // Use update mutation
        await updateMutation.mutateAsync({ 
          id: specialDay.id, 
          data: formattedData 
        });
      } else {
        // Use create mutation
        await createMutation.mutateAsync(formattedData);
      }
      
    } catch (error) {
      console.error("Error saving special day:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save special day",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Special Sunday" : "Add Special Sunday"}</DialogTitle>
          <DialogDescription>
            Mark a Sunday as special with a name, description, and custom color.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Easter Sunday" {...field} />
                  </FormControl>
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
                    <Input placeholder="e.g., Special Easter service with communion" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full border" 
                      style={{ backgroundColor: field.value }}
                    />
                    <FormControl className="flex-1">
                      <Input type="color" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameFormat, setNameFormat] = useState("full");
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [deadlineDay, setDeadlineDay] = useState(20); // Default to 20th
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"card" | "simple">("card");
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);
  const [specialDayToEdit, setSpecialDayToEdit] = useState<SpecialDay | null>(null);
  const [specialDayToDelete, setSpecialDayToDelete] = useState<SpecialDay | null>(null);
  const [showSpecialDayDialog, setShowSpecialDayDialog] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const { data: settings } = useQuery<{ deadlineDay: number, nameFormat: string }>({
    queryKey: ["/api/admin/settings"],
  });
  
  const { data: availability } = useQuery({
    queryKey: ["/api/availability"],
  });
  
  // Special days queries and mutations
  const createSpecialDayMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating special day with data:", data);
      const res = await apiRequest("POST", "/api/admin/special-days", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
      queryClient.invalidateQueries({ queryKey: ["/api/special-days/month"] });
      setShowSpecialDayDialog(false);
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
  
  const updateSpecialDayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      console.log(`Updating special day ${id} with data:`, data);
      const res = await apiRequest("PATCH", `/api/admin/special-days/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
      queryClient.invalidateQueries({ queryKey: ["/api/special-days/month"] });
      setShowSpecialDayDialog(false);
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
  
  const deleteSpecialDayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/special-days/${id}`);
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

  useEffect(() => {
    if (settings) {
      setDeadlineDay(settings.deadlineDay);
    }
  }, [settings]);
  
  // Process availability data to determine which months have data
  useEffect(() => {
    if (availability && Array.isArray(availability)) {
      // Get months with available members
      const months = new Set<string>();
      
      // Only include records where someone is available
      availability
        .filter(record => record.isAvailable)
        .forEach(record => {
          const date = new Date(record.serviceDate);
          const monthYear = format(date, 'yyyy-MM'); // Format as YYYY-MM for uniqueness
          months.add(monthYear);
        });
      
      // Convert to Date objects (first day of each month)
      const monthDates = Array.from(months).map(monthStr => {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
      });
      
      // Sort by date
      monthDates.sort((a, b) => a.getTime() - b.getTime());
      
      setAvailableMonths(monthDates);
      
      // If there are available months and current selection isn't in the list,
      // select the most recent month
      if (monthDates.length > 0) {
        const currentMonthYear = format(selectedMonth, 'yyyy-MM');
        const hasCurrentMonth = Array.from(months).includes(currentMonthYear);
        
        if (!hasCurrentMonth) {
          // Get the most recent month (last in the sorted array)
          setSelectedMonth(monthDates[monthDates.length - 1]);
        }
      }
    }
  }, [availability, selectedMonth]);

  const createMemberMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/admin/members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setFirstName("");
      setLastName("");
      toast({
        title: "Success",
        description: "Member added successfully",
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

  const deleteMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Member removed successfully",
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { deadlineDay: number }) => {
      const res = await apiRequest("POST", "/api/admin/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
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

  const handleDeleteMember = (member: User) => {
    if (user && member.id === user.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }
    setMemberToDelete(member);
  };

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  const { data: formatData } = useQuery<{ format: string }>({
    queryKey: ["/api/admin/name-format"],
  });

  useEffect(() => {
    if (formatData) {
      setNameFormat(formatData.format);
    }
  }, [formatData]);

  const updateNameFormatMutation = useMutation({
    mutationFn: async (data: { format: string }) => {
      const res = await apiRequest("POST", "/api/admin/name-format", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/name-format"] });
      toast({
        title: "Success",
        description: "Name format updated",
      });
    },
  });

  const handleCreateMember = () => {
    if (!firstName || !lastName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createMemberMutation.mutate({ firstName, lastName });
  };

  const sendRosterEmailMutation = useMutation({
    mutationFn: async (data: { 
      email: string; 
      month: string;
      viewType: "card" | "simple";
    }) => {
      const res = await apiRequest("POST", "/api/admin/send-roster", data);
      const result = await res.json();
      // If there's an error message in the response, throw it
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Roster has been sent to the specified email address",
      });
      setEmailAddress("");
    },
    onError: (error: Error) => {
      console.error("Email sending error:", error);
      toast({
        title: "Error Sending Email",
        description: `Failed to send the roster: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const testEmailConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/test-email");
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email Configuration Valid",
          description: "Your email settings are correctly configured.",
        });
      } else {
        toast({
          title: "Email Configuration Invalid",
          description: data.details || "Email configuration test failed",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Email testing error:", error);
      toast({
        title: "Email Configuration Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendRoster = async () => {
    if (!emailAddress) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingEmail(true);
      await sendRosterEmailMutation.mutateAsync({ 
        email: emailAddress,
        month: format(selectedMonth, "yyyy-MM-dd"),
        viewType: viewType
      });
    } finally {
      setIsSendingEmail(false);
    }
  };


  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name Display Format</label>
                  <select
                    className="w-full mt-1 border rounded-md h-10 px-3"
                    value={nameFormat}
                    onChange={(e) => {
                      setNameFormat(e.target.value);
                      updateNameFormatMutation.mutate({ format: e.target.value });
                    }}
                  >
                    <option value="full">Full Name (John Smith)</option>
                    <option value="first">First Name Only (John)</option>
                    <option value="last">Last Name Only (Smith)</option>
                    <option value="initials">Initials (JS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Availability Deadline Day</label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Members cannot update their availability after this day of the month.
                  </p>
                  <select
                    className="w-full mt-1 border rounded-md h-10 px-3"
                    value={deadlineDay}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setDeadlineDay(value);
                      updateSettingsMutation.mutate({ deadlineDay: value });
                    }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}th of the month
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Special Sundays</span>
                <Button 
                  onClick={() => {
                    setSpecialDayToEdit(null);
                    setShowSpecialDayDialog(true);
                  }} 
                  size="sm"
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Special Sunday
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Special Days Query */}
                <SpecialDaysList 
                  currentMonth={selectedMonth}
                  onEdit={(specialDay) => {
                    setSpecialDayToEdit(specialDay);
                    setShowSpecialDayDialog(true);
                  }}
                  onDelete={(specialDay) => setSpecialDayToDelete(specialDay)}
                />
                
                {/* Special Day Dialog */}
                <SpecialDayDialog 
                  isOpen={showSpecialDayDialog}
                  onClose={() => setShowSpecialDayDialog(false)}
                  specialDay={specialDayToEdit}
                  createMutation={createSpecialDayMutation}
                  updateMutation={updateSpecialDayMutation}
                />
                
                {/* Delete Confirmation */}
                <AlertDialog open={!!specialDayToDelete} onOpenChange={() => setSpecialDayToDelete(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the special day "{specialDayToDelete?.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        if (specialDayToDelete) {
                          try {
                            toast({
                              title: "Deleting...",
                              description: "Removing special day"
                            });
                            
                            // Direct API call to ensure we have access to proper error handling
                            const response = await fetch(`/api/admin/special-days/${specialDayToDelete.id}`, {
                              method: 'DELETE',
                              credentials: 'include'
                            });
                            
                            if (!response.ok) {
                              throw new Error(`Failed to delete special day: ${response.status}`);
                            }
                            
                            // Invalidate the special days query to refresh the data
                            queryClient.invalidateQueries({ queryKey: ["/api/special-days"] });
                            
                            toast({
                              title: "Success",
                              description: "Special day deleted successfully"
                            });
                          } catch (error) {
                            console.error("Error deleting special day:", error);
                            toast({
                              title: "Error",
                              description: "Failed to delete special day",
                              variant: "destructive"
                            });
                          } finally {
                            setSpecialDayToDelete(null);
                          }
                        }
                      }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                  <Button
                    onClick={handleSendRoster}
                    disabled={isSendingEmail}
                    className="whitespace-nowrap"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Roster
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedMonth, "MMMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="p-2 text-center text-sm font-medium border-b">
                          Available Months
                        </div>
                        {availableMonths.length > 0 ? (
                          <div className="p-3">
                            {availableMonths.map((month) => (
                              <Button
                                key={format(month, 'yyyy-MM')}
                                variant={format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM') ? "default" : "outline"}
                                className="w-full mb-2"
                                onClick={() => setSelectedMonth(month)}
                              >
                                {format(month, 'MMMM yyyy')}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3">
                            <p className="text-sm text-center text-muted-foreground">
                              No months with availability data
                            </p>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">View Style</label>
                    <Select
                      value={viewType}
                      onValueChange={(value) => setViewType(value as "card" | "simple")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a view type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Card View</SelectItem>
                        <SelectItem value="simple">Simple View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mt-4">
                  The roster for {format(selectedMonth, "MMMM yyyy")} will be sent as a PDF attachment.
                </p>
                {/* Email test button removed as requested - keep functionality for future use
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => testEmailConfigMutation.mutate()}
                    disabled={testEmailConfigMutation.isPending}
                    className="w-full"
                  >
                    {testEmailConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <span className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Test Email Configuration
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to validate your email server connection without sending an email.
                  </p>
                </div>
                */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateMember}
                disabled={createMemberMutation.isPending}
              >
                {createMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Member"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 text-left">Name</th>
                      <th className="p-4 text-left">Role</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="p-4">
                          {member.firstName} {member.lastName}
                        </td>
                        <td className="p-4">
                          {member.isAdmin ? "Admin" : "Member"}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteMember(member)}
                            disabled={deleteMemberMutation.isPending || member.id === user?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog 
        open={!!memberToDelete} 
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member and all of their availability records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}