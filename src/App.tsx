import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { GlobalSearch } from "@/components/GlobalSearch";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import EstimationVoting from "./pages/EstimationVoting";
import EstimationResults from "./pages/EstimationResults";
import MyWork from "./pages/MyWork";
import ReportIncident from "./pages/ReportIncident";
import LookupIncident from "./pages/LookupIncident";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <GlobalSearch />
        <KeyboardShortcuts />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reportar-incidente" element={<ReportIncident />} />
          <Route path="/consultar-incidente" element={<LookupIncident />} />
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/proyectos" element={<AppLayout><Projects /></AppLayout>} />
          <Route path="/proyectos/:id" element={<AppLayout><ProjectDetail /></AppLayout>} />
          <Route path="/proyectos/:id/estimacion/:roundId/votar" element={<AppLayout><EstimationVoting /></AppLayout>} />
          <Route path="/proyectos/:id/estimacion/:roundId/resultados" element={<AppLayout><EstimationResults /></AppLayout>} />
          <Route path="/my-work" element={<AppLayout><MyWork /></AppLayout>} />
          <Route path="/incidents" element={<AppLayout><Incidents /></AppLayout>} />
          <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          <Route path="/notificaciones" element={<AppLayout><Notifications /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
