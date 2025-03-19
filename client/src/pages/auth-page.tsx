import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserCircle2, Lock, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Change the sorting function to sort A to Z
  const sortedUsers = users?.sort((a, b) => {
    const lastNameCompare = b.lastName.localeCompare(a.lastName);  // Reverse the comparison
    if (lastNameCompare !== 0) return -lastNameCompare;  // Negate to get correct order
    return -b.firstName.localeCompare(a.firstName);  // Negate to get correct order
  });

  // Get the selected user's name for display
  const selectedUser = users?.find(u => u.id === selectedId);
  const selectedName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "";

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
      setLocation("/");
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
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex justify-center">
              <Logo />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-primary" />
                Select Your Name
              </label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedName || "Search for your name..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search by name..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandEmpty>No member found.</CommandEmpty>
                    <CommandGroup>
                      {sortedUsers?.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.firstName} ${user.lastName}`}
                          onSelect={() => {
                            setSelectedId(user.id);
                            setOpen(false);
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                PIN
              </label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-6 digit PIN"
              />
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
              onClick={handleLogin}
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col justify-center p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-primary/90 to-primary/80 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0yNCA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIgZmlsbD0iY3VycmVudENvbG9yIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-10" />
        <div className="relative">
          <h1 className="text-4xl font-bold mb-4">Welcome to AvailEase</h1>
          <p className="text-lg opacity-90">
            Easily manage your availability for upcoming church services.
          </p>
        </div>
      </div>
    </div>
  );
}