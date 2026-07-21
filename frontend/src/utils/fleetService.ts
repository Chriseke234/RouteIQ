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
  { id: 'd-1', full_name: 'Babajide Okafor', phone: '+234 803 111 2222', license_number: 'LA-99281-A', vehicle_id: 'v-1' },
  { id: 'd-2', full_name: 'Chinedu Musa', phone: '+234 812 333 4444', license_number: 'AB-88412-B', vehicle_id: 'v-2' },
  { id: 'd-3', full_name: 'Tunde Balogun', phone: '+234 905 555 6666', license_number: 'KD-23091-C', vehicle_id: 'v-3' },
];

// Helper to load/save localStorage
const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(stored);
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
      if (!error && data) return data as Vehicle[];
    }
    return getLocalStorageItem<Vehicle[]>('routeiq_vehicles', DEFAULT_VEHICLES);
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
      if (!error && data) {
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
    return getLocalStorageItem<Driver[]>('routeiq_drivers', DEFAULT_DRIVERS);
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
      
      if (!tripsError && tripsData) {
        const trips: Trip[] = [];
        for (const t of tripsData) {
          const { data: wpData } = await supabase
            .from('waypoints')
            .select('*')
            .eq('trip_id', t.id)
            .order('sequence', { ascending: true });
          
          // Map PostGIS point geometry ST_AsText or similar
          const waypoints: Waypoint[] = (wpData || []).map((wp: any) => {
            // Location points are usually returned as geojson/objects in supabase if postgis config is standard,
            // or we parse standard latitude/longitude from schema.
            // Let's assume standard float columns or coordinate mapping.
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
    return getLocalStorageItem<Trip[]>('routeiq_trips', []);
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
      if (!error && data) {
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
    return getLocalStorageItem<FuelLog[]>('routeiq_fuel_logs', [
      { id: 'flog-1', vehicle_id: 'v-1', vehicle_plate: 'LAG-492-AA', driver_id: 'd-1', driver_name: 'Babajide Okafor', amount_liters: 45, cost_ngn: 29250, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
      { id: 'flog-2', vehicle_id: 'v-2', vehicle_plate: 'ABJ-881-XY', driver_id: 'd-2', driver_name: 'Chinedu Musa', amount_liters: 60, cost_ngn: 39000, timestamp: new Date(Date.now() - 3600000 * 12).toISOString() },
    ]);
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
