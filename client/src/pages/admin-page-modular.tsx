import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChurchLoader } from "@/components/church-loader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/user";
import { CalendarRange, Database, Plus, Settings, Users } from "lucide-react";
import { format } from "date-fns";

// Import the modularized SpecialDaysManager
import { SpecialDaysManager } from "@/features/special-days";

// Import all other existing components 
// (MembersList, RosterBuilder, etc.)

export default function AdminPage() {
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Settings state
  const [nameFormat, setNameFormat] = useState('full');
  const [deadlineDay, setDeadlineDay] = useState(15);

  // Load settings from the server
  const { data: settings } = useQuery<{ deadlineDay: number, nameFormat: string }>({
    queryKey: ["/api/admin/settings"],
  });
  
  // Update settings when they change on the server
  useEffect(() => {
    if (settings) {
      setNameFormat(settings.nameFormat || 'full');
      setDeadlineDay(settings.deadlineDay || 15);
    }
  }, [settings]);

  // Settings mutations
  const updateNameFormatMutation = useMutation({
    mutationFn: async (data: { format: string }) => {
      return await apiRequest({
        method: "PATCH",
        data
      }, "/api/admin/name-format");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Name format updated successfully",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { deadlineDay: number }) => {
      return await apiRequest({
        method: "PATCH",
        data
      }, "/api/admin/settings");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
  });
  
  // Access control - only allow admins
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ChurchLoader 
          type="users" 
          size="lg" 
          text="Loading admin panel..." 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
        
        <Tabs defaultValue="settings" className="w-full mb-8">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="settings" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Settings & Special Days</span>
              <span className="md:hidden">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Member Management</span>
              <span className="md:hidden">Members</span>
            </TabsTrigger>
            <TabsTrigger value="roster" className="flex-1">
              <CalendarRange className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Roster Builder</span>
              <span className="md:hidden">Roster</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-6">
            {/* System Settings Card */}
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

            {/* Special Sundays Card */}
            <Card>
              <CardHeader>
                <CardTitle>Special Sundays</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Using the modular SpecialDaysManager instead of the inline component */}
                <SpecialDaysManager />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Member Management</CardTitle>
              </CardHeader>
              <CardContent>
                {/* MembersList component would go here */}
                <div className="text-center p-8 text-muted-foreground">
                  Member Management component would be integrated here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="roster">
            <Card>
              <CardHeader>
                <CardTitle>Roster Builder</CardTitle>
              </CardHeader>
              <CardContent>
                {/* RosterBuilder component would go here */}
                <div className="text-center p-8 text-muted-foreground">
                  Roster Builder component would be integrated here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}