import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoaderOverlay } from "@/components/loader-overlay";
import { updatePinSchema, updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";

// Convert Zod schema to include PIN confirmation
const changePinFormSchema = updatePinSchema.extend({
  confirmNewPin: z.string()
    .min(4, "PIN must be at least 4 digits")
    .max(6, "PIN must be at most 6 digits")
    .regex(/^\d+$/, "PIN must be numeric only")
}).refine(data => data.newPin === data.confirmNewPin, {
  message: "PINs don't match",
  path: ["confirmNewPin"]
});

type ChangePinFormValues = z.infer<typeof changePinFormSchema>;
type ProfileFormValues = z.infer<typeof updateProfileSchema>;

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Profile update form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      currentPin: "", // Add default value for currentPin
    },
  });

  // PIN change form
  const pinForm = useForm<ChangePinFormValues>({
    resolver: zodResolver(changePinFormSchema),
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmNewPin: "",
    },
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      return apiRequest(
        "PATCH",
        "/api/update-profile",
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // PIN change mutation
  const pinMutation = useMutation({
    mutationFn: async (data: ChangePinFormValues) => {
      // We don't send confirmNewPin to the server
      const { confirmNewPin, ...pinData } = data;
      return apiRequest(
        "POST",
        "/api/change-pin",
        pinData
      );
    },
    onSuccess: () => {
      toast({
        title: "PIN Changed",
        description: "Your PIN has been changed successfully.",
      });
      pinForm.reset({
        currentPin: "",
        newPin: "",
        confirmNewPin: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "PIN Change Failed",
        description: error.message || "Failed to change PIN.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };

  const onPinSubmit = (data: ChangePinFormValues) => {
    pinMutation.mutate(data);
  };

  const isLoading = profileMutation.isPending || pinMutation.isPending;

  return (
    <div className="container mx-auto py-8 max-w-2xl relative min-h-[calc(100vh-10rem)]">
      <LoaderOverlay 
        isLoading={isLoading} 
        loadingText="Updating..." 
        type="users" 
      />
      
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your name. This will appear on rosters and attendance lists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="currentPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enter Current PIN to Confirm</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Current PIN" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Update Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change PIN</CardTitle>
              <CardDescription>
                Change your login PIN. You'll use this to sign in to the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pinForm}>
                <form onSubmit={pinForm.handleSubmit(onPinSubmit)} className="space-y-4">
                  <FormField
                    control={pinForm.control}
                    name="currentPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current PIN</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Current PIN" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pinForm.control}
                    name="newPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New PIN</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="New PIN" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pinForm.control}
                    name="confirmNewPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New PIN</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm new PIN" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Change PIN
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}