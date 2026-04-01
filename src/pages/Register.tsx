import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    toast({
      title: "Acceso solo por invitación",
      description: "El acceso es solo por invitación. Contacta al administrador.",
      variant: "destructive",
    });
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
