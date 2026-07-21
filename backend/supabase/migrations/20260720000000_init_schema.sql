-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create Fleets table
CREATE TABLE IF NOT EXISTS public.fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'driver')),
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL UNIQUE,
    model TEXT,
    capacity_kg NUMERIC,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Drivers table (extends profile with driver-specific properties)
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    phone TEXT,
    license_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'delayed')),
    route_geometry TEXT, -- Optional route path representation (e.g. LineString JSON)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 1
);

-- Create Waypoints table
CREATE TABLE IF NOT EXISTS public.waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    name TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'visited', 'skipped')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create GPS Logs table
CREATE TABLE IF NOT EXISTS public.gps_logs (
    id UUID PRIMARY KEY, -- Idempotent UUIDv4 from offline client
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    speed NUMERIC, -- speed in km/h
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Fuel Logs table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_liters NUMERIC NOT NULL,
    cost_ngn NUMERIC NOT NULL,
    location GEOMETRY(Point, 4326),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Offline Sync Queue table
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inject spatial GIST indexes on coordinate columns
CREATE INDEX IF NOT EXISTS waypoints_location_gist_idx ON public.waypoints USING GIST (location);
CREATE INDEX IF NOT EXISTS gps_logs_location_gist_idx ON public.gps_logs USING GIST (location);
CREATE INDEX IF NOT EXISTS fuel_logs_location_gist_idx ON public.fuel_logs USING GIST (location);

-- Enable RLS on all tables
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- Helper security definer functions to get current user details without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_fleet_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT fleet_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies

-- 1. Fleets
CREATE POLICY fleet_select_policy ON public.fleets
    FOR SELECT USING (id = public.get_user_fleet_id());

-- 2. Profiles
CREATE POLICY profile_select_policy ON public.profiles
    FOR SELECT USING (fleet_id = public.get_user_fleet_id());

CREATE POLICY profile_self_update_policy ON public.profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 3. Vehicles
CREATE POLICY vehicle_manager_policy ON public.vehicles
    FOR ALL USING (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager')
    WITH CHECK (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager');

CREATE POLICY vehicle_driver_policy ON public.vehicles
    FOR SELECT USING (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'driver');

-- 4. Drivers
CREATE POLICY driver_manager_policy ON public.drivers
    FOR ALL USING (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager')
    WITH CHECK (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager');

CREATE POLICY driver_driver_policy ON public.drivers
    FOR SELECT USING (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'driver');

-- 5. Trips
CREATE POLICY trip_manager_policy ON public.trips
    FOR ALL USING (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager')
    WITH CHECK (fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager');

CREATE POLICY trip_driver_policy ON public.trips
    FOR ALL USING (driver_id = auth.uid() AND public.get_user_role() = 'driver')
    WITH CHECK (driver_id = auth.uid() AND public.get_user_role() = 'driver');

-- 6. Waypoints
CREATE POLICY waypoint_manager_policy ON public.waypoints
    FOR ALL USING (trip_id IN (SELECT id FROM public.trips WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'))
    WITH CHECK (trip_id IN (SELECT id FROM public.trips WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'));

CREATE POLICY waypoint_driver_policy ON public.waypoints
    FOR ALL USING (trip_id IN (SELECT id FROM public.trips WHERE driver_id = auth.uid() AND public.get_user_role() = 'driver'))
    WITH CHECK (trip_id IN (SELECT id FROM public.trips WHERE driver_id = auth.uid() AND public.get_user_role() = 'driver'));

-- 7. GPS Logs
CREATE POLICY gps_manager_policy ON public.gps_logs
    FOR SELECT USING (driver_id IN (SELECT id FROM public.profiles WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'));

CREATE POLICY gps_driver_policy ON public.gps_logs
    FOR ALL USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- 8. Fuel Logs
CREATE POLICY fuel_manager_policy ON public.fuel_logs
    FOR ALL USING (driver_id IN (SELECT id FROM public.profiles WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'))
    WITH CHECK (driver_id IN (SELECT id FROM public.profiles WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'));

CREATE POLICY fuel_driver_policy ON public.fuel_logs
    FOR ALL USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- 9. Offline Sync Queue
CREATE POLICY sync_manager_policy ON public.offline_sync_queue
    FOR SELECT USING (driver_id IN (SELECT id FROM public.profiles WHERE fleet_id = public.get_user_fleet_id() AND public.get_user_role() = 'manager'));

CREATE POLICY sync_driver_policy ON public.offline_sync_queue
    FOR ALL USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid());

-- Enable Realtime publications for gps_logs and trips
DO $$
BEGIN
  -- Add gps_logs if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND n.nspname = 'public' 
      AND c.relname = 'gps_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_logs;
  END IF;

  -- Add trips if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime' 
      AND n.nspname = 'public' 
      AND c.relname = 'trips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
  END IF;
END $$;
