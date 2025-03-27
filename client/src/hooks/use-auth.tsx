import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UpdatePin } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (id: number, pin: string) => Promise<User>;
  logout: () => Promise<void>;
  changePin: (data: UpdatePin) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      return await apiRequest("/api/login", { 
        method: "POST", 
        data: { id, pin } 
      });
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "You put the wrong PIN",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePinMutation = useMutation({
    mutationFn: async (data: UpdatePin) => {
      return await apiRequest("/api/change-pin", {
        method: "POST",
        data: data
      });
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "PIN updated",
        description: "Your PIN has been successfully changed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change PIN",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        login: async (id, pin) => {
          const user = await loginMutation.mutateAsync({ id, pin });
          return user;
        },
        logout: async () => {
          await logoutMutation.mutateAsync();
        },
        changePin: async (data) => {
          await changePinMutation.mutateAsync(data);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}