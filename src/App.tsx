import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import PlanningPoker from "./pages/PlanningPoker";
import MyWork from "./pages/MyWork";

const App = () => (
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
          <Route path="/proyectos" element={<AppLayout><Projects /></AppLayout>} />
          <Route path="/proyectos/:id" element={<AppLayout><ProjectDetail /></AppLayout>} />
          <Route path="/proyectos/:id/planning-poker/:sessionId" element={<AppLayout><PlanningPoker /></AppLayout>} />
          <Route path="/my-work" element={<AppLayout><MyWork /></AppLayout>} />
          <Route path="/incidents" element={<AppLayout><div className="text-foreground">Incidentes - Próximamente</div></AppLayout>} />
          <Route path="/reports" element={<AppLayout><div className="text-foreground">Reportes - Próximamente</div></AppLayout>} />
          <Route path="/settings" element={<AppLayout><div className="text-foreground">Configuración - Próximamente</div></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
