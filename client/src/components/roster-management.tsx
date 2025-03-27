
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Draggable } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";

interface RosterManagementProps {
  availableUsers: User[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  assignedUsers: User[];
}

export function RosterManagement({ 
  availableUsers, 
  selectedDate, 
  onDateChange,
  assignedUsers 
}: RosterManagementProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, serviceDate }: { userId: number; serviceDate: string }) => {
      const response = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serviceDate }),
      });
      if (!response.ok) throw new Error("Failed to assign user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async ({ userId, serviceDate }: { userId: number; serviceDate: string }) => {
      const response = await fetch(`/api/admin/roster/${serviceDate}/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });

  const handleAssignUser = async (user: User) => {
    await assignUserMutation.mutateAsync({
      userId: user.id,
      serviceDate: format(selectedDate, "yyyy-MM-dd"),
    });
  };

  const handleRemoveUser = async (user: User) => {
    await removeUserMutation.mutateAsync({
      userId: user.id,
      serviceDate: format(selectedDate, "yyyy-MM-dd"),
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Select Service Date</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Available Members</h3>
            <div className="space-y-2">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    "hover:bg-accent cursor-pointer",
                    selectedUser?.id === user.id && "bg-accent"
                  )}
                  onClick={() => handleAssignUser(user)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Assigned Members</h3>
            <div className="space-y-2">
              {assignedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUser(user)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
