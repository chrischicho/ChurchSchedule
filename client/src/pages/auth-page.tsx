import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updatePinSchema, User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, login, changePin } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handlePinChange = async () => {
    if (newPin !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const pinData = updatePinSchema.parse({
        currentPin: pin,
        newPin: newPin,
      });
      await changePin(pinData);
      setShowPinDialog(false);
      setLocation("/");
      toast({
        title: "Success",
        description: "Your PIN has been changed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "PIN must be 4-6 digits",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async () => {
    if (!selectedId) {
      toast({
        title: "Error",
        description: "Please select your name",
        variant: "destructive",
      });
      return;
    }

    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "Error",
        description: "PIN must be 4-6 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      await login(selectedId, pin);
      const selectedUser = users?.find(u => u.id === selectedId);
      if (selectedUser?.firstLogin) {
        setShowPinDialog(true);
      } else {
        setLocation("/");
      }
    } catch (error) {
      // Error handling is done in useAuth
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen grid md:grid-cols-2">
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex justify-center">
                <Logo />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Your Name</label>
                <Select value={selectedId?.toString()} onValueChange={(value) => setSelectedId(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN</label>
                <Input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4-6 digit PIN"
                />
              </div>
              <Button className="w-full" onClick={handleLogin}>
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="hidden md:flex flex-col justify-center p-8 bg-primary text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4">Welcome to AvailEase</h1>
          <p className="text-lg opacity-90">
            Easily manage your availability for upcoming church services.
          </p>
        </div>
      </div>

      <Dialog open={showPinDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Your PIN</DialogTitle>
            <DialogDescription>
              Since this is your first login, please change your PIN for security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New PIN</label>
              <Input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-6 digit PIN"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm PIN</label>
              <Input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Confirm your PIN"
              />
            </div>
            <Button className="w-full" onClick={handlePinChange}>
              Change PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}