import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthCheck from "./components/AuthCheck";
import AppLayout from "./components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import MyEvents from "./pages/MyEvents";
import Favorites from "./pages/Favorites";
import PastEvents from "./pages/PastEvents";
import CreateEvent from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import Profile from "./pages/Profile";
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
                <MyEvents />
              </AppLayout>
            } />
            <Route path="/favorites" element={
              <AppLayout>
                <Favorites />
              </AppLayout>
            } />
            <Route path="/past-events" element={
              <AppLayout>
                <PastEvents />
              </AppLayout>
            } />
            <Route path="/profile" element={
              <AppLayout>
                <Profile />
              </AppLayout>
            } />
            <Route path="/create-event" element={
              <AppLayout>
                <CreateEvent />
              </AppLayout>
            } />
            <Route path="/events/:eventId" element={
              <AppLayout>
                <EventDetails />
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
