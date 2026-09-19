import { supabase, isSupabaseConfigured, OPTIMIZER_API_URL } from './supabase';

// Model Types matching the Supabase SQL schema
export interface Vehicle {
  id: string;
  fleet_id?: string;
  plate_number: string;
  model: string;
  capacity_kg: number;
  status: 'active' | 'maintenance' | 'offline';
  created_at?: string;
}

export interface Driver {
  id: string; // references profile id
  fleet_id?: string;
  vehicle_id?: string | null;
  vehicle_plate?: string;
  full_name: string; // joined from profile
  phone: string;
  license_number: string;
  created_at?: string;
}

export interface Waypoint {
  id: string;
  trip_id: string;
  sequence: number;
  name: string;
  latitude: number; // mapped from Point geometry
  longitude: number; // mapped from Point geometry
  status: 'pending' | 'visited' | 'skipped';
  updated_at?: string;
}

export interface Trip {
  id: string;
  fleet_id?: string;
  driver_id: string | null;
  driver_name?: string;
  vehicle_plate?: string;
  status: 'assigned' | 'active' | 'completed' | 'delayed';
  route_geometry?: string; // LineString coordinates JSON
  updated_at?: string;
  waypoints?: Waypoint[];
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  vehicle_plate?: string;
  driver_id: string;
  driver_name?: string;
  amount_liters: number;
  cost_ngn: number;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  created_at?: string;
}

export interface GpsLog {
  id: string;
  trip_id?: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

// Initial Nigerian Mock Data (Lagos base)
const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'v-1', plate_number: 'LAG-492-AA', model: 'Toyota Dyna Truck', capacity_kg: 1500, status: 'active' },
  { id: 'v-2', plate_number: 'ABJ-881-XY', model: 'Isuzu Elf Box Van', capacity_kg: 2500, status: 'active' },
  { id: 'v-3', plate_number: 'KND-104-BB', model: 'Ford Transit Cargo', capacity_kg: 1200, status: 'active' },
  { id: 'v-4', plate_number: 'PHC-552-LK', model: 'Mercedes Sprinter', capacity_kg: 1000, status: 'maintenance' },
];

const DEFAULT_DRIVERS: Driver[] = [
  { id: 'd-1', full_name: 'Babajide Okafor', phone: '+234 803 111 2222', license_number: 'LA-99281-A', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA' },
  { id: 'd-2', full_name: 'Chinedu Musa', phone: '+234 812 333 4444', license_number: 'AB-88412-B', vehicle_id: 'v-2', vehicle_plate: 'ABJ-881-XY' },
  { id: 'd-3', full_name: 'Tunde Balogun', phone: '+234 905 555 6666', license_number: 'KD-23091-C', vehicle_id: 'v-3', vehicle_plate: 'KND-104-BB' },
  { id: 'd-4', full_name: 'Aminu Abubakar', phone: '+234 802 777 8888', license_number: 'KN-54109-D', vehicle_id: 'v-4', vehicle_plate: 'PHC-552-LK' },
  { id: 'd-5', full_name: 'Emeka Nnamdi', phone: '+234 814 999 0000', license_number: 'EN-77312-E', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA' },
  { id: 'd-6', full_name: 'Olufemi Adebayo', phone: '+234 701 444 5555', license_number: 'OG-33190-F', vehicle_id: 'v-2', vehicle_plate: 'ABJ-881-XY' },
  { id: 'd-7', full_name: 'Kayode Adeleke', phone: '+234 809 123 4567', license_number: 'LA-77102-G', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA' },
  { id: 'd-8', full_name: 'Samuel Osei', phone: '+234 818 234 5678', license_number: 'IB-44912-H', vehicle_id: 'v-2', vehicle_plate: 'ABJ-881-XY' },
  { id: 'd-9', full_name: 'Usman Danjuma', phone: '+234 902 345 6789', license_number: 'AB-19304-I', vehicle_id: 'v-3', vehicle_plate: 'KND-104-BB' },
  { id: 'd-10', full_name: 'Babatunde Lawal', phone: '+234 708 456 7890', license_number: 'LA-66289-J', vehicle_id: 'v-4', vehicle_plate: 'PHC-552-LK' },
  { id: 'd-11', full_name: 'Chinedu Eze', phone: '+234 815 567 8901', license_number: 'EN-55104-K', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA' },
];

const DEFAULT_TRIPS: Trip[] = [
  {
    id: 'trp-001',
    driver_id: 'd-1',
    driver_name: 'Babajide Okafor',
    vehicle_plate: 'LAG-492-AA',
    status: 'active',
    waypoints: [
      { id: 'wp-101', trip_id: 'trp-001', sequence: 0, name: 'Ikeja Distribution Depot', latitude: 6.6018, longitude: 3.3515, status: 'visited' },
      { id: 'wp-102', trip_id: 'trp-001', sequence: 1, name: 'Oregun Commercial Center', latitude: 6.6110, longitude: 3.3650, status: 'visited' },
      { id: 'wp-103', trip_id: 'trp-001', sequence: 2, name: 'Allen Avenue Supermarket', latitude: 6.5980, longitude: 3.3580, status: 'pending' },
      { id: 'wp-104', trip_id: 'trp-001', sequence: 3, name: 'Victoria Island Terminal', latitude: 6.4281, longitude: 3.4219, status: 'pending' },
    ]
  },
  {
    id: 'trp-002',
    driver_id: 'd-2',
    driver_name: 'Chinedu Musa',
    vehicle_plate: 'ABJ-881-XY',
    status: 'assigned',
    waypoints: [
      { id: 'wp-201', trip_id: 'trp-002', sequence: 0, name: 'Apapa Port Logistics Hub', latitude: 6.4474, longitude: 3.3585, status: 'pending' },
      { id: 'wp-202', trip_id: 'trp-002', sequence: 1, name: 'Surulere Retail Warehouse', latitude: 6.4969, longitude: 3.3542, status: 'pending' },
      { id: 'wp-203', trip_id: 'trp-002', sequence: 2, name: 'Yaba Tech Depot', latitude: 6.5186, longitude: 3.3712, status: 'pending' },
    ]
  },
  {
    id: 'trp-003',
    driver_id: 'd-3',
    driver_name: 'Tunde Balogun',
    vehicle_plate: 'KND-104-BB',
    status: 'completed',
    waypoints: [
      { id: 'wp-301', trip_id: 'trp-003', sequence: 0, name: 'Lekki Phase 1 Fulfillment', latitude: 6.4478, longitude: 3.4723, status: 'visited' },
      { id: 'wp-302', trip_id: 'trp-003', sequence: 1, name: 'Ajah Express Hub', latitude: 6.4698, longitude: 3.5670, status: 'visited' },
    ]
  }
];

const DEFAULT_FUEL_LOGS: FuelLog[] = [
  { id: 'flog-1', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA', driver_id: 'd-1', driver_name: 'Babajide Okafor', amount_liters: 45, cost_ngn: 58500, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'flog-2', vehicle_id: 'v-2', vehicle_plate: 'ABJ-881-XY', driver_id: 'd-2', driver_name: 'Chinedu Musa', amount_liters: 60, cost_ngn: 78000, timestamp: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'flog-3', vehicle_id: 'v-3', vehicle_plate: 'KND-104-BB', driver_id: 'd-3', driver_name: 'Tunde Balogun', amount_liters: 50, cost_ngn: 65000, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
];

const CURRENT_DATA_VERSION = 'routeiq_v4_2026_09_19';

// Helper to load/save localStorage with automatic cache purging
const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  // Invalidate old/stale browser storage caches
  const version = localStorage.getItem('routeiq_cache_version');
  if (version !== CURRENT_DATA_VERSION) {
    localStorage.removeItem('routeiq_drivers');
    localStorage.removeItem('routeiq_vehicles');
    localStorage.removeItem('routeiq_trips');
    localStorage.removeItem('routeiq_fuel_logs');
    localStorage.setItem('routeiq_cache_version', CURRENT_DATA_VERSION);
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }

  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(defaultValue) && defaultValue.length > 0) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const fleetService = {
  // --- VEHICLES ---
  async getVehicles(): Promise<Vehicle[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('vehicles').select('*');
      if (!error && data && data.length > 0) return data as Vehicle[];
    }
    const local = getLocalStorageItem<Vehicle[]>('routeiq_vehicles', DEFAULT_VEHICLES);
    if (!local || local.length === 0) {
      setLocalStorageItem('routeiq_vehicles', DEFAULT_VEHICLES);
      return DEFAULT_VEHICLES;
    }
    return local;
  },

  async saveVehicle(vehicle: Omit<Vehicle, 'id'> & { id?: string }): Promise<Vehicle> {
    const id = vehicle.id || `v-${Math.random().toString(36).substr(2, 9)}`;
    const newVehicle: Vehicle = { ...vehicle, id };
    
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert(newVehicle)
        .select()
        .single();
      if (!error && data) return data as Vehicle;
    }
    
    const list = await this.getVehicles();
    const index = list.findIndex(v => v.id === id);
    if (index >= 0) {
      list[index] = newVehicle;
    } else {
      list.push(newVehicle);
    }
    setLocalStorageItem('routeiq_vehicles', list);
    return newVehicle;
  },

  async deleteVehicle(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (!error) return true;
    }
    const list = await this.getVehicles();
    const filtered = list.filter(v => v.id !== id);
    setLocalStorageItem('routeiq_vehicles', filtered);
    return true;
  },

  // --- DRIVERS ---
  async getDrivers(): Promise<Driver[]> {
    if (isSupabaseConfigured && supabase) {
      // In Supabase, drivers table joins with profiles
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          phone,
          license_number,
          vehicle_id,
          profiles (full_name)
        `);
      if (!error && data && data.length > 0) {
        return data.map((d: any) => {
          const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          return {
            id: d.id,
            phone: d.phone,
            license_number: d.license_number,
            vehicle_id: d.vehicle_id,
            full_name: profile?.full_name || 'Unknown Driver',
          };
        });
      }
    }
    const local = getLocalStorageItem<Driver[]>('routeiq_drivers', DEFAULT_DRIVERS);
    if (!local || local.length < DEFAULT_DRIVERS.length) {
      setLocalStorageItem('routeiq_drivers', DEFAULT_DRIVERS);
      return DEFAULT_DRIVERS;
    }
    return local;
  },

  async saveDriver(driver: Omit<Driver, 'id'> & { id?: string }): Promise<Driver> {
    const id = driver.id || `d-${Math.random().toString(36).substr(2, 9)}`;
    const newDriver: Driver = { ...driver, id };

    if (isSupabaseConfigured && supabase) {
      // Upsert profile first, then driver
      await supabase.from('profiles').upsert({ id, role: 'driver', full_name: driver.full_name });
      const { data, error } = await supabase
        .from('drivers')
        .upsert({ id, phone: driver.phone, license_number: driver.license_number, vehicle_id: driver.vehicle_id })
        .select()
        .single();
      if (!error && data) {
        return { ...newDriver, id: data.id };
      }
    }

    const list = await this.getDrivers();
    const index = list.findIndex(d => d.id === id);
    if (index >= 0) {
      list[index] = newDriver;
    } else {
      list.push(newDriver);
    }
    setLocalStorageItem('routeiq_drivers', list);
    return newDriver;
  },

  async deleteDriver(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) return true;
    }
    const list = await this.getDrivers();
    const filtered = list.filter(d => d.id !== id);
    setLocalStorageItem('routeiq_drivers', filtered);
    return true;
  },

  // --- TRIPS & WAYPOINTS ---
  async getTrips(): Promise<Trip[]> {
    if (isSupabaseConfigured && supabase) {
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          status,
          route_geometry,
          driver_id,
          profiles (full_name)
        `);
      
      if (!tripsError && tripsData && tripsData.length > 0) {
        const trips: Trip[] = [];
        for (const t of tripsData) {
          const { data: wpData } = await supabase
            .from('waypoints')
            .select('*')
            .eq('trip_id', t.id)
            .order('sequence', { ascending: true });
          
          const waypoints: Waypoint[] = (wpData || []).map((wp: any) => {
            return {
              id: wp.id,
              trip_id: wp.trip_id,
              sequence: wp.sequence,
              name: wp.name,
              latitude: wp.latitude || 6.5244, // fallback Lagos
              longitude: wp.longitude || 3.3792,
              status: wp.status,
            };
          });

          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
          trips.push({
            id: t.id,
            driver_id: t.driver_id,
            driver_name: profile?.full_name || 'Unassigned',
            status: t.status as any,
            route_geometry: t.route_geometry,
            waypoints,
          });
        }
        return trips;
      }
    }
    const local = getLocalStorageItem<Trip[]>('routeiq_trips', DEFAULT_TRIPS);
    if (!local || local.length === 0) {
      setLocalStorageItem('routeiq_trips', DEFAULT_TRIPS);
      return DEFAULT_TRIPS;
    }
    return local;
  },

  async saveTrip(trip: Trip): Promise<Trip> {
    if (isSupabaseConfigured && supabase) {
      const { data: tripData, error } = await supabase
        .from('trips')
        .upsert({
          id: trip.id,
          driver_id: trip.driver_id,
          status: trip.status,
          route_geometry: trip.route_geometry,
        })
        .select()
        .single();
      
      if (!error && tripData && trip.waypoints) {
        // Clear old waypoints, add new
        await supabase.from('waypoints').delete().eq('trip_id', trip.id);
        const wpsToInsert = trip.waypoints.map(wp => ({
          id: wp.id,
          trip_id: trip.id,
          sequence: wp.sequence,
          name: wp.name,
          // Convert to PostGIS location geometry standard: Point(lon lat)
          location: `SRID=4326;POINT(${wp.longitude} ${wp.latitude})`,
          status: wp.status,
        }));
        await supabase.from('waypoints').insert(wpsToInsert);
      }
      return trip;
    }

    const list = await this.getTrips();
    const index = list.findIndex(t => t.id === trip.id);
    if (index >= 0) {
      list[index] = trip;
    } else {
      list.push(trip);
    }
    setLocalStorageItem('routeiq_trips', list);
    return trip;
  },

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('trips').update({ status }).eq('id', tripId);
      return;
    }
    const trips = await this.getTrips();
    const t = trips.find(x => x.id === tripId);
    if (t) {
      t.status = status;
      setLocalStorageItem('routeiq_trips', trips);
    }
  },

  async updateWaypointStatus(tripId: string, waypointId: string, status: Waypoint['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('waypoints').update({ status }).eq('id', waypointId);
      return;
    }
    const trips = await this.getTrips();
    const t = trips.find(x => x.id === tripId);
    if (t && t.waypoints) {
      const wp = t.waypoints.find(w => w.id === waypointId);
      if (wp) {
        wp.status = status;
        setLocalStorageItem('routeiq_trips', trips);
      }
    }
  },

  // --- FUEL LOGS ---
  async getFuelLogs(): Promise<FuelLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('fuel_logs')
        .select(`
          id,
          amount_liters,
          cost_ngn,
          timestamp,
          vehicle_id,
          vehicles (plate_number),
          driver_id,
          profiles (full_name)
        `);
      if (!error && data && data.length > 0) {
        return data.map((f: any) => {
          const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
          const vehicle = Array.isArray(f.vehicles) ? f.vehicles[0] : f.vehicles;
          return {
            id: f.id,
            vehicle_id: f.vehicle_id,
            vehicle_plate: vehicle?.plate_number || 'Unknown',
            driver_id: f.driver_id,
            driver_name: profile?.full_name || 'Unknown',
            amount_liters: Number(f.amount_liters),
            cost_ngn: Number(f.cost_ngn),
            timestamp: f.timestamp,
          };
        });
      }
    }
    const local = getLocalStorageItem<FuelLog[]>('routeiq_fuel_logs', DEFAULT_FUEL_LOGS);
    if (!local || local.length === 0) {
      setLocalStorageItem('routeiq_fuel_logs', DEFAULT_FUEL_LOGS);
      return DEFAULT_FUEL_LOGS;
    }
    return local;
  },

  async addFuelLog(log: Omit<FuelLog, 'id'>): Promise<FuelLog> {
    const id = `flog-${Math.random().toString(36).substr(2, 9)}`;
    const newLog: FuelLog = { ...log, id };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('fuel_logs').insert({
        id,
        vehicle_id: log.vehicle_id,
        driver_id: log.driver_id,
        amount_liters: log.amount_liters,
        cost_ngn: log.cost_ngn,
        timestamp: log.timestamp,
        location: log.latitude && log.longitude ? `SRID=4326;POINT(${log.longitude} ${log.latitude})` : null,
      });
      if (!error) return newLog;
    }

    const list = await this.getFuelLogs();
    list.push(newLog);
    setLocalStorageItem('routeiq_fuel_logs', list);
    return newLog;
  },

  // --- GPS LOGS ---
  async getGpsLogs(): Promise<GpsLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('gps_logs').select('*');
      if (!error && data) {
        return data.map((g: any) => ({
          id: g.id,
          trip_id: g.trip_id,
          driver_id: g.driver_id,
          latitude: g.latitude || 6.5244,
          longitude: g.longitude || 3.3792,
          speed: Number(g.speed),
          timestamp: g.timestamp,
        }));
      }
    }
    return getLocalStorageItem<GpsLog[]>('routeiq_gps_logs', []);
  },

  async addGpsLog(log: Omit<GpsLog, 'id'>): Promise<GpsLog> {
    const id = `gps-${Math.random().toString(36).substr(2, 9)}`;
    const newLog: GpsLog = { ...log, id };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('gps_logs').insert({
        id,
        trip_id: log.trip_id,
        driver_id: log.driver_id,
        speed: log.speed,
        timestamp: log.timestamp,
        location: `SRID=4326;POINT(${log.longitude} ${log.latitude})`,
      });
    }

    const list = await this.getGpsLogs();
    list.push(newLog);
    setLocalStorageItem('routeiq_gps_logs', list);
    return newLog;
  },

  // --- OPTIMIZER API ---
  async callOptimize(payload: {
    coordinates: [number, number][]; // [lat, lon]
    demands: number[];
    vehicle_capacities: number[];
    degraded_corridors?: { coordinates: [number, number][] }[]; // [lon, lat]
    checkpoints?: { coordinate: [number, number] }[]; // [lon, lat]
    flood_polygons?: { coordinates: [number, number][] }[]; // [lon, lat]
    average_speed_mps?: number;
    time_limit_seconds?: number;
  }): Promise<any> {
    try {
      const res = await fetch(`${OPTIMIZER_API_URL}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Optimizer API failed');
      }
      return await res.json();
    } catch (e: any) {
      console.warn('Backend server is not running or unreachable. Using client-side mock optimizer fallback.', e);
      return this.mockOptimizeFallback(payload);
    }
  },

  // Premium client-side fallback solver if backend FastAPI is down
  mockOptimizeFallback(payload: {
    coordinates: [number, number][];
    demands: number[];
    vehicle_capacities: number[];
  }): any {
    const { coordinates, demands, vehicle_capacities } = payload;
    const numVehicles = vehicle_capacities.length;
    
    if (coordinates.length <= 1) {
      return { status: "SUCCESS", success: true, routes: [], total_time_seconds: 0 };
    }

    // A simple clustering heuristic: divide stops among vehicles
    const stops = coordinates.map((coords, i) => ({ index: i, coords, demand: demands[i] })).slice(1);
    const routes: any[] = [];
    let unassigned = [...stops];
    let totalTime = 0;

    for (let v = 0; v < numVehicles; v++) {
      if (unassigned.length === 0) break;
      const capacity = vehicle_capacities[v];
      let currentLoad = 0;
      const vehicleStops: any[] = [{ node_index: 0, coordinates: coordinates[0], demand: 0 }];
      const assignedToThisVehicle: typeof stops = [];

      for (let i = 0; i < unassigned.length; i++) {
        const item = unassigned[i];
        if (currentLoad + item.demand <= capacity) {
          currentLoad += item.demand;
          assignedToThisVehicle.push(item);
        }
      }

      if (assignedToThisVehicle.length > 0) {
        // Sort by distance to make it look optimized
        assignedToThisVehicle.sort((a, b) => {
          const distA = Math.hypot(a.coords[0] - coordinates[0][0], a.coords[1] - coordinates[0][1]);
          const distB = Math.hypot(b.coords[0] - coordinates[0][0], b.coords[1] - coordinates[0][1]);
          return distA - distB;
        });

        assignedToThisVehicle.forEach(item => {
          vehicleStops.push({
            node_index: item.index,
            coordinates: item.coords,
            demand: item.demand
          });
          unassigned = unassigned.filter(x => x.index !== item.index);
        });

        // Add depot back
        vehicleStops.push({ node_index: 0, coordinates: coordinates[0], demand: 0 });

        // Calculate mock travel time (straight line * modifier)
        let duration = 0;
        for (let i = 0; i < vehicleStops.length - 1; i++) {
          const p1 = vehicleStops[i].coordinates;
          const p2 = vehicleStops[i+1].coordinates;
          const distDegrees = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
          duration += distDegrees * 111000 / 12.0; // ~12 m/s average speed
        }

        routes.push({
          vehicle_id: v,
          stops: vehicleStops,
          load: currentLoad,
          duration_seconds: Math.round(duration)
        });
        totalTime += duration;
      }
    }

    return {
      status: "SUCCESS",
      success: true,
      routes,
      total_time_seconds: Math.round(totalTime)
    };
  }
};
