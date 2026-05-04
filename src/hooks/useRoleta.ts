import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { invokeCloudFunction } from "../lib/cloudFunctions";

export interface CorretorRoleta {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  total_received: number;
  last_received_at: string | null;
}

export interface AssignmentLog {
  id: string;
  lead_id: string;
  corretor_id: string | null;
  source: string;
  assigned_by: string | null;
  created_at: string;
  lead_name?: string | null;
  corretor_name?: string | null;
}

/**
 * Carrega corretores ordenados pelo round-robin atual (last_received_at asc)
 * + métricas e o histórico de distribuições.
 */
export function useRoleta(enabled: boolean = true) {
  const [corretores, setCorretores] = useState<CorretorRoleta[]>([]);
  const [history, setHistory] = useState<AssignmentLog[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id,name,email,phone,is_active,last_received_at,total_received")
      .order("name", { ascending: true });
    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    setCorretores(
      ((profiles as CorretorRoleta[]) ?? []).map((c) => ({
        ...c,
        is_active: c.is_active ?? true,
        total_received: c.total_received ?? 0,
        last_received_at: c.last_received_at ?? null,
      })),
    );

    const { data: logs } = await supabase
      .from("lead_assignments")
      .select("id,lead_id,corretor_id,source,assigned_by,created_at, leads(name), profiles!lead_assignments_corretor_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    setHistory(
      ((logs as unknown as Array<AssignmentLog & {
        leads?: { name: string } | null;
        profiles?: { name: string } | null;
      }>) ?? []).map((r) => ({
        id: r.id,
        lead_id: r.lead_id,
        corretor_id: r.corretor_id,
        source: r.source,
        assigned_by: r.assigned_by,
        created_at: r.created_at,
        lead_name: r.leads?.name ?? null,
        corretor_name: r.profiles?.name ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!enabled) return;
    load();

    // Realtime: refresh quando lead_assignments muda
    const ch = supabase
      .channel("roleta-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_assignments" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** Próximo corretor na fila (ativo, com menor last_received_at) */
  const fila = corretores
    .filter((c) => c.is_active)
    .sort((a, b) => {
      const ta = a.last_received_at ? new Date(a.last_received_at).getTime() : 0;
      const tb = b.last_received_at ? new Date(b.last_received_at).getTime() : 0;
      return ta - tb;
    });

  const toggleActive = async (corretorId: string, isActive: boolean) => {
    // Otimista
    setCorretores((prev) =>
      prev.map((c) => (c.id === corretorId ? { ...c, is_active: isActive } : c)),
    );
    const { error } = await invokeCloudFunction("toggle-corretor-active", {
      corretor_id: corretorId, is_active: isActive,
    });
    if (error) {
      setError(error.message);
      load();
    }
  };

  const redistribute = async (leadId: string, corretorId: string | null) => {
    const { error } = await supabase.functions.invoke("roleta-redistribute", {
      body: { lead_id: leadId, corretor_id: corretorId },
    });
    if (error) setError(error.message);
    else load();
  };

  return { corretores, fila, history, loading, error, toggleActive, redistribute, reload: load };
}
