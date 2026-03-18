import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import WelcomePage from "@/pages/welcome-page";
import DashboardPage from "@/pages/dashboard-page";
import ToolsPage from "@/pages/tools-page";
import AffiliatesPage from "@/pages/affiliates-page";
import AdminPage from "@/pages/admin-page";
import AdminUsersPage from "@/pages/admin-users-page";
import AdminToolsPage from "@/pages/admin-tools-page";
import AdminPayoutsPage from "@/pages/admin-payouts-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import AdminLoginPage from "@/pages/admin-login-page";
import CredentialsPage from "@/pages/credentials-page";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <img src={logoSrc} alt="OneStack" className="h-12 w-12 rounded-md mx-auto object-cover" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/auth" />;

  const isAdminRoute = location.startsWith("/admin");
  if (isAdminRoute && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 premium-bg">
          <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 backdrop-blur-sm bg-background/80 relative z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto page-content">
            <Switch>
              <Route path="/credentials" component={CredentialsPage} />
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/tools" component={ToolsPage} />
              <Route path="/affiliates" component={AffiliatesPage} />
              <Route path="/admin" component={AdminPage} />
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/tools" component={AdminToolsPage} />
              <Route path="/admin/payouts" component={AdminPayoutsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>
      <Route path="/welcome">
        <WelcomePage />
      </Route>
      <Route path="/reset-password">
        {user ? <Redirect to="/dashboard" /> : <ResetPasswordPage />}
      </Route>
      <Route path="/admin-login">
        {user ? <Redirect to="/dashboard" /> : <AdminLoginPage />}
      </Route>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <LandingPage />}
      </Route>
      <Route>
        <ProtectedLayout />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
