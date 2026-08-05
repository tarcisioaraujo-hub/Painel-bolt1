/*
# Ajustes para Consultório Odontológico

## Resumo
- Adiciona campo `procedure` (procedimento dental, texto livre) em appointments
- Torna `service_id` nullable (remoção do módulo de serviços da interface)
- Cria tabela `schedule_status` para controle de agenda aberta/fechada por dia

## Alterações

### appointments (modificada)
- Novo campo: `procedure` (text, nullable) — descricao do procedimento dental
- `service_id` agora é nullable

### schedule_status (nova tabela)
- `id` (uuid, PK)
- `schedule_date` (date, unico) — data da agenda
- `is_open` (boolean, padrao true) — true = agenda aberta, false = fechada
- `created_at` (timestamptz)

## Seguranca
- RLS habilitado em `schedule_status`.
- Politicas CRUD para `anon, authenticated` (uso interno, sem login).
*/

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS procedure text;
ALTER TABLE appointments ALTER COLUMN service_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS schedule_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date date NOT NULL UNIQUE,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_schedule_status" ON schedule_status;
CREATE POLICY "anon_select_schedule_status" ON schedule_status FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_schedule_status" ON schedule_status;
CREATE POLICY "anon_insert_schedule_status" ON schedule_status FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_schedule_status" ON schedule_status;
CREATE POLICY "anon_update_schedule_status" ON schedule_status FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_schedule_status" ON schedule_status;
CREATE POLICY "anon_delete_schedule_status" ON schedule_status FOR DELETE
  TO anon, authenticated USING (true);