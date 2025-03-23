import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import RosterPage from "@/pages/roster-page";
import AdminPage from "@/pages/admin-page";
import AccountPage from "@/pages/account-page";
import { ProtectedRoute } from "./lib/protected-route";
import { FirstLoginModal } from "@/components/first-login-modal";
import { SplashScreen } from "@/components/splash-screen";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/roster" component={RosterPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/account" component={AccountPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <FirstLoginModal />
        <Toaster />
        <SplashScreen />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;