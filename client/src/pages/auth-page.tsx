import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { UserCircle2, Lock } from "lucide-react";
import { VerseDisplay } from "@/components/verse-display";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pin, setPin] = useState("");
  const pinInputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Sort users alphabetically by lastName, then firstName
  const sortedUsers = users?.sort((a, b) => {
    const lastNameCompare = b.lastName.localeCompare(a.lastName);
    if (lastNameCompare !== 0) return -lastNameCompare;
    return -b.firstName.localeCompare(a.firstName);
  });

  // Filter users based on search value
  const filteredUsers = sortedUsers?.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(searchValue.toLowerCase());
  });

  // Use useEffect for redirection instead of doing it during render
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

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

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // If exact match is found, select that user
    const exactMatch = sortedUsers?.find(
      user => `${user.firstName} ${user.lastName}`.toLowerCase() === value.toLowerCase()
    );

    if (exactMatch) {
      setSelectedId(exactMatch.id);
      pinInputRef.current?.focus();
    } else {
      setSelectedId(null);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredUsers && filteredUsers.length > 0) {
      const firstUser = filteredUsers[0];
      setSelectedId(firstUser.id);
      setSearchValue(`${firstUser.firstName} ${firstUser.lastName}`);
      pinInputRef.current?.focus();
    }
  };

  const handlePinKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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
              <div className="relative">
                <Input
                  type="text"
                  value={searchValue}
                  onChange={handleNameChange}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Type your name..."
                  className="w-full"
                  list="user-names"
                />
                <datalist id="user-names">
                  {filteredUsers?.slice(0, 6).map((user) => (
                    <option
                      key={user.id}
                      value={`${user.firstName} ${user.lastName}`}
                    />
                  ))}
                </datalist>
              </div>
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
                onKeyDown={handlePinKeyDown}
                placeholder="Enter 4-6 digit PIN"
                ref={pinInputRef}
              />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              onClick={handleLogin}
            >
              Log In
            </Button>
            
            {/* Display random Bible verse */}
            <VerseDisplay className="mt-6" category="serving" />
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex flex-col justify-center p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-primary/90 to-primary/80 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0yNCA2YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2eiIgZmlsbD0iY3VycmVudENvbG9yIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-10" />
        <div className="relative">
          <h1 className="text-4xl font-bold mb-4">Welcome to ElServe</h1>
          <p className="text-lg opacity-90">
            Easily manage your availability for upcoming church services.
          </p>
        </div>
      </div>
    </div>
  );
}