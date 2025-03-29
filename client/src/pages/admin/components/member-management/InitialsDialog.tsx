import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, CustomInitials } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

interface InitialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
  onSubmit: (data: CustomInitials) => void;
  isSubmitting: boolean;
}

// Extend the schema with custom validation
const initialsSchema = z.object({
  initials: z.string()
    .min(1, "Initials are required")
    .max(3, "Initials cannot be longer than 3 characters")
    .regex(/^[A-Z]+$/, "Initials must be uppercase letters only"),
});

export function InitialsDialog({
  isOpen,
  onClose,
  member,
  onSubmit,
  isSubmitting,
}: InitialsDialogProps) {
  const form = useForm<CustomInitials>({
    resolver: zodResolver(initialsSchema),
    defaultValues: {
      initials: "",
    },
  });

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        initials: member.initials,
      });
    }
  }, [member, form]);

  const handleSubmit = (data: CustomInitials) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Member Initials</DialogTitle>
          <DialogDescription>
            {member ? `Changing initials for ${member.firstName} ${member.lastName}` : "Update member initials"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="initials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initials</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Initials (e.g., ABC)"
                      maxLength={3}
                      className="uppercase"
                      // Force uppercase while typing
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum 3 uppercase letters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}