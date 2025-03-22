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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Trash2, Mail, Settings, Calendar as CalendarIcon } from "lucide-react";

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

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
  });

  const { data: settings } = useQuery<{ deadlineDay: number, nameFormat: string }>({
    queryKey: ["/api/admin/settings"],
  });
  
  const { data: availability } = useQuery({
    queryKey: ["/api/availability"],
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