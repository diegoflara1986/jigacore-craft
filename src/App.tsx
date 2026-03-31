import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<AppLayout><Index /></AppLayout>} />
              <Route path="/projects" element={<AppLayout><div className="text-foreground">Proyectos - Próximamente</div></AppLayout>} />
              <Route path="/my-work" element={<AppLayout><div className="text-foreground">Mi Trabajo - Próximamente</div></AppLayout>} />
              <Route path="/incidents" element={<AppLayout><div className="text-foreground">Incidentes - Próximamente</div></AppLayout>} />
              <Route path="/reports" element={<AppLayout><div className="text-foreground">Reportes - Próximamente</div></AppLayout>} />
              <Route path="/settings" element={<AppLayout><div className="text-foreground">Configuración - Próximamente</div></AppLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
