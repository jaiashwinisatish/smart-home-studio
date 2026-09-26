-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms readable" ON public.rooms FOR SELECT TO anon, authenticated USING (true);

-- Devices
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('light','fan','ac','plug')),
  status BOOLEAN NOT NULL DEFAULT false,
  fan_speed INT NOT NULL DEFAULT 1 CHECK (fan_speed BETWEEN 1 AND 5),
  temperature INT NOT NULL DEFAULT 24 CHECK (temperature BETWEEN 16 AND 30),
  power_rating INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX devices_room_id_idx ON public.devices(room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated, anon;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices readable" ON public.devices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "devices updatable" ON public.devices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Device state history
CREATE TABLE public.device_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  status BOOLEAN NOT NULL,
  fan_speed INT,
  temperature INT,
  power_watts NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX device_states_device_idx ON public.device_states(device_id, updated_at DESC);
GRANT SELECT, INSERT ON public.device_states TO authenticated, anon;
GRANT ALL ON public.device_states TO service_role;
ALTER TABLE public.device_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "states readable" ON public.device_states FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "states insertable" ON public.device_states FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Automation rules
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated, anon;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules all" ON public.automation_rules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Command history
CREATE TABLE public.command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ui',
  parsed_action JSONB,
  result TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX command_history_created_idx ON public.command_history(created_at DESC);
GRANT SELECT, INSERT ON public.command_history TO authenticated, anon;
GRANT ALL ON public.command_history TO service_role;
ALTER TABLE public.command_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history readable" ON public.command_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "history insertable" ON public.command_history FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed rooms
INSERT INTO public.rooms (name, slug) VALUES
  ('Living Room','living_room'),
  ('Bedroom','bedroom'),
  ('Kitchen','kitchen'),
  ('Study Room','study_room');

-- Seed devices
INSERT INTO public.devices (room_id, name, slug, type, status, fan_speed, temperature, power_rating)
SELECT r.id, d.name, d.slug, d.type, d.status, d.fan_speed, d.temperature, d.power_rating
FROM (VALUES
  ('living_room','Main Light','living_room_light','light', true, 1, 24, 10),
  ('living_room','Ceiling Fan','living_room_fan','fan', true, 3, 24, 50),
  ('living_room','Air Conditioner','living_room_ac','ac', false, 1, 24, 1200),
  ('bedroom','Bedroom Light','bedroom_light','light', false, 1, 24, 10),
  ('bedroom','Bedroom Fan','bedroom_fan','fan', false, 2, 24, 50),
  ('bedroom','Bedroom AC','bedroom_ac','ac', false, 1, 22, 1200),
  ('kitchen','Kitchen Light','kitchen_light','light', true, 1, 24, 12),
  ('kitchen','Smart Plug','kitchen_plug','plug', false, 1, 24, 150),
  ('study_room','Study Light','study_light','light', false, 1, 24, 10),
  ('study_room','Study Fan','study_fan','fan', false, 1, 24, 50)
) AS d(room_slug,name,slug,type,status,fan_speed,temperature,power_rating)
JOIN public.rooms r ON r.slug = d.room_slug;

-- Seed automation rules
INSERT INTO public.automation_rules (name, condition, action, enabled) VALUES
  ('Evening lights', '{"type":"time","value":"19:00"}', '{"type":"device","target":"living_room_light","action":"ON"}', true),
  ('Night shutdown', '{"type":"time","value":"23:00"}', '{"type":"all_lights","action":"OFF"}', true),
  ('Hot day cooling', '{"type":"temperature","operator":">","value":30}', '{"type":"device","target":"bedroom_fan","action":"ON"}', false);

-- Seed some energy history samples
INSERT INTO public.device_states (device_id, status, fan_speed, temperature, power_watts, updated_at)
SELECT d.id, true, d.fan_speed, d.temperature, d.power_rating, now() - (g.n || ' hours')::interval
FROM public.devices d CROSS JOIN generate_series(1, 48) AS g(n)
WHERE random() < 0.35;