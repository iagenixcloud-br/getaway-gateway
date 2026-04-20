import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

export interface CorretorOption {
  id: string;
  name: string;
  email: string;
}

/**
 * Carrega a lista de corretores (todos os profiles do Lovable Cloud).
 * Usado pelo admin para atribuir leads e para quebrar métricas por corretor.
 */
export function useCorretores(enabled: boolean = true) {
  const [corretores, setCorretores] = useState<CorretorOption[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,name,email")
        .order("name", { ascending: true });
      if (!mounted) return;
      setCorretores((data as CorretorOption[]) ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [enabled]);

  return { corretores, loading };
}
