import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthCheck from "./components/AuthCheck";
import AppLayout from "./components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthCheck>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <AppLayout>
                <Index />
              </AppLayout>
            } />
            <Route path="/my-events" element={
              <AppLayout>
                <div>My Events Page - Coming Soon</div>
              </AppLayout>
            } />
            <Route path="/favorites" element={
              <AppLayout>
                <div>Favorites Page - Coming Soon</div>
              </AppLayout>
            } />
            <Route path="/past-events" element={
              <AppLayout>
                <div>Past Events Page - Coming Soon</div>
              </AppLayout>
            } />
            <Route path="/profile" element={
              <AppLayout>
                <div>Profile Page - Coming Soon</div>
              </AppLayout>
            } />
            <Route path="/create-event" element={
              <AppLayout>
                <div>Create Event Page - Coming Soon</div>
              </AppLayout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthCheck>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
