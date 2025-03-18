import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updatePinSchema } from "@shared/schema";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, login, changePin } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async () => {
    if (!selectedId) {
      toast({
        title: "Error",
        description: "Please select your name",
        variant: "destructive",
      });
      return;
    }

    if (pin.length !== 6) {
      toast({
        title: "Error",
        description: "PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      await login(selectedId, pin);
    } catch (error) {
      // Error handling is done in useAuth
    }
  };

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
    } catch (error) {
      toast({
        title: "Error",
        description: "PIN must be exactly 6 digits",
        variant: "destructive",
      });
    }
  };

  return (
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
              <select
                className="w-full p-2 border rounded"
                value={selectedId || ""}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                <option value="">Select...</option>
                {/* User list will be populated from API */}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PIN</label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit PIN"
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
  );
}
