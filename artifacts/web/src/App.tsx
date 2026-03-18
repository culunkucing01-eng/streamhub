import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Channels from "@/pages/channels";
import Streams from "@/pages/streams";
import Plans from "@/pages/billing/plans";
import Invoices from "@/pages/billing/invoices";
import Subscriptions from "@/pages/billing/subscriptions";
import ServerMonitor from "@/pages/server";
import PublicPlayer from "@/pages/public-player";
import EmbedPlayer from "@/pages/embed-player";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/player/:id" component={PublicPlayer} />
      <Route path="/embed/:id" component={EmbedPlayer} />
      
      {/* Protected Routes */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/channels" component={() => <ProtectedRoute component={Channels} />} />
      <Route path="/streams" component={() => <ProtectedRoute component={Streams} />} />
      <Route path="/billing/plans" component={() => <ProtectedRoute component={Plans} />} />
      <Route path="/billing/invoices" component={() => <ProtectedRoute component={Invoices} />} />
      <Route path="/billing/subscriptions" component={() => <ProtectedRoute component={Subscriptions} />} />
      <Route path="/server" component={() => <ProtectedRoute component={ServerMonitor} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
