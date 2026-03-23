import { createSafeActionClient } from "next-safe-action";
import { createClient } from "@/lib/supabase/client";

// Cliente público sin validación de sesión
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof Error) {
      return e.message;
    }
    return "Ocurrió un error inesperado en el servidor.";
  },
});

// Cliente protegido (asegura que hay usuario autenticado)
export const authActionClient = actionClient.use(async ({ next }) => {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("No autorizado");
  }

  // Pasa el usuario y la instancia supabase al contexto
  return next({ ctx: { user, supabase } });
});
