import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import GroceryList from "./pages/GroceryList";
import Tasks from "./pages/Tasks";
import Family from "./pages/Family";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import PricingPage from "./pages/PricingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/grocery" element={<GroceryList />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/family" element={<Family />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
