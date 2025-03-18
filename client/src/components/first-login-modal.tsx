import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { updatePinSchema } from "@shared/schema";

export function FirstLoginModal() {
  const { user, changePin } = useAuth();
  const { toast } = useToast();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setIsSubmitting(true);
      const pinData = updatePinSchema.parse({
        currentPin: "000000", // Default PIN
        newPin: newPin,
      });
      await changePin(pinData);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.firstLogin) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome! Please Change Your PIN</DialogTitle>
          <DialogDescription>
            For security reasons, you must change your PIN before continuing.
            Choose a new 4-6 digit PIN that you'll remember.
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
          <Button 
            className="w-full" 
            onClick={handlePinChange}
            disabled={isSubmitting}
          >
            Set New PIN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
