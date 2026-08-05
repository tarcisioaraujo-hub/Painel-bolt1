/*
# Sistema de Controle de Agenda (Painel Interno)

## Resumo
Cria as tabelas para um painel administrativo interno de controle de agenda:
- clients — cadastro de clientes
- services — serviços disponíveis
- appointments — agendamentos vinculando cliente + serviço + data/hora

## Segurança
- RLS habilitado em todas as tabelas.
- App de uso interno sem tela de login → políticas TO anon, authenticated (CRUD liberado).
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  price numeric(10,2) NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- clients policies
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE
  TO anon, authenticated USING (true);

-- services policies
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE
  TO anon, authenticated USING (true);

-- appointments policies
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE
  TO anon, authenticated USING (true);