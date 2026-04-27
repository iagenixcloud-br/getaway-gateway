-- ============================================================
-- Migration: Adicionar suporte à etapa "Follow-up" no Kanban
-- Projeto: Andrade Mob (gycrprnkuwlzntqvpoxl) — RODAR LÁ, NÃO no Lovable Cloud deste projeto.
-- ============================================================

-- 1) Coluna previous_status (preenchida automaticamente por trigger)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- 2) Trigger BEFORE UPDATE: grava o status anterior toda vez que `status` muda
CREATE OR REPLACE FUNCTION public.leads_track_previous_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.previous_status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_track_previous_status ON public.leads;

CREATE TRIGGER trg_leads_track_previous_status
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.leads_track_previous_status();

-- 3) (Opcional, descomente se houver CHECK constraint em status)
-- ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
-- ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
--   CHECK (status IN ('lead_novo','curioso','negocio','agendamento','visita','proposta','venda','follow_up'));
