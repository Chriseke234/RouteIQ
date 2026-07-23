'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Map, Clock, Play, RotateCcw, Truck, Compass, CheckCircle } from 'lucide-react';
import { fleetService, Trip, Driver } from '@/utils/fleetService';

// Dynamic import of map component
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-zinc-950 flex items-center justify-center rounded-2xl border border-zinc-800">
      <span className="text-zinc-500 font-semibold animate-pulse">Loading Map Engine...</span>
    </div>
  )
});

interface SimulatedDriver {
  driver_id: string;
  driver_name: string;
  vehicle_plate: string;
  latitude: number;
  longitude: number;
  speed: number;
  progressIndex: number;
  coordinates: [number, number][];
}

export default function LiveMapPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [simulatedDrivers, setSimulatedDrivers] = useState<SimulatedDriver[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      const t = await fleetService.getTrips();
      const d = await fleetService.getDrivers();
      setTrips(t);
      setDrivers(d);
    }
    loadData();

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  const handleStartSimulation = () => {
    if (isSimulating) {
      // Pause
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      setIsSimulating(false);
      return;
    }

    // Identify active or assigned trips that have waypoints
    const activeTrips = trips.filter(t => t.waypoints && t.waypoints.length > 2);
    
    if (activeTrips.length === 0) {
      alert("No active or dispatched routes found. Please optimize and dispatch routes first!");
      return;
    }

    // Set trips status to active
    activeTrips.forEach(async (t) => {
      if (t.status === 'assigned') {
        await fleetService.updateTripStatus(t.id, 'active');
      }
    });

    // Initialize simulation coordinates for each trip
    const initialSims: SimulatedDriver[] = activeTrips.map(trip => {
      let coords: [number, number][] = [];
      try {
        if (trip.route_geometry) {
          coords = JSON.parse(trip.route_geometry);
        }
      } catch (e) {
        console.error('Failed to parse trip geometry', e);
      }

      if (coords.length === 0 && trip.waypoints) {
        coords = trip.waypoints.map(w => [w.latitude, w.longitude]);
      }

      // Find first coordinate or fallback to Lagos
      const startCoord = coords[0] || [6.5244, 3.3792];

      return {
        driver_id: trip.driver_id || `d-mock-${trip.id}`,
        driver_name: trip.driver_name || 'Simulated Driver',
        vehicle_plate: trip.vehicle_plate || 'TRUCK-1',
        latitude: startCoord[0],
        longitude: startCoord[1],
        speed: 40 + Math.random() * 20, // 40-60 km/h
        progressIndex: 0,
        coordinates: coords
      };
    });

    setSimulatedDrivers(initialSims);
    setIsSimulating(true);

    // Setup interval to advance driver positions
    simulationTimerRef.current = setInterval(() => {
      setSimulatedDrivers(prev => {
        let allCompleted = true;
        const updated = prev.map(drv => {
          if (drv.progressIndex >= drv.coordinates.length - 1) {
            // Finished
            return { ...drv, speed: 0 };
          }
          
          allCompleted = false;
          const nextIndex = drv.progressIndex + 1;
          const nextCoord = drv.coordinates[nextIndex];
          
          // Speed variation
          const speedVar = 45 + Math.random() * 15;

          // Mock adding location log to service/Supabase database
          fleetService.addGpsLog({
            driver_id: drv.driver_id,
            latitude: nextCoord[0],
            longitude: nextCoord[1],
            speed: speedVar,
            timestamp: new Date().toISOString()
          });

          // Check if driver reached a waypoint and update its status
          const matchedTrip = trips.find(t => t.driver_id === drv.driver_id || `d-mock-${t.id}` === drv.driver_id);
          if (matchedTrip && matchedTrip.waypoints) {
            const currentWaypoint = matchedTrip.waypoints.find(
              w => Math.abs(w.latitude - nextCoord[0]) < 0.0001 && Math.abs(w.longitude - nextCoord[1]) < 0.0001
            );
            if (currentWaypoint && currentWaypoint.status === 'pending') {
              fleetService.updateWaypointStatus(matchedTrip.id, currentWaypoint.id, 'visited');
            }
          }

          return {
            ...drv,
            latitude: nextCoord[0],
            longitude: nextCoord[1],
            speed: speedVar,
            progressIndex: nextIndex
          };
        });

        if (allCompleted) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setIsSimulating(false);
          // Set all active trips to completed
          activeTrips.forEach(async (t) => {
            await fleetService.updateTripStatus(t.id, 'completed');
          });
          alert('All simulated deliveries have successfully arrived at their destinations!');
        }

        return updated;
      });
    }, 2000);
  };

  const handleResetSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setSimulatedDrivers([]);
    setIsSimulating(false);
    
    // Set active trips back to assigned
    trips.forEach(async (t) => {
      if (t.status === 'active' || t.status === 'completed') {
        await fleetService.updateTripStatus(t.id, 'assigned');
        if (t.waypoints) {
          t.waypoints.forEach(w => {
            fleetService.updateWaypointStatus(t.id, w.id, 'pending');
          });
        }
      }
    });

    // Reload trips state
    fleetService.getTrips().then(t => setTrips(t));
  };

  // Convert simulated drivers format for map rendering
  const liveDrivers = simulatedDrivers.map(sd => ({
    driver_id: sd.driver_id,
    driver_name: sd.driver_name,
    latitude: sd.latitude,
    longitude: sd.longitude,
    speed: sd.speed
  }));

  // Convert VRP routes geometry for background map rendering
  const mapColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
  const mapRoutes = trips.map((trip, idx) => {
    let stops: any[] = [];
    try {
      if (trip.route_geometry) {
        const coords = JSON.parse(trip.route_geometry);
        stops = coords.map((c: any) => ({
          coordinates: c as [number, number],
          name: '',
          demand: 0
        }));
      }
    } catch (e) {
      // fallback
    }
    return {
      vehicle_id: idx,
      color: mapColors[idx % mapColors.length],
      stops
    };
  });

  // Extract all stops for the map to display delivery pins
  const mapStops: any[] = [];
  trips.forEach(t => {
    if (t.waypoints) {
      t.waypoints.forEach((w, idx) => {
        if (idx > 0 && idx < (t.waypoints?.length || 0) - 1) { // Skip depot starts/ends
          mapStops.push({
            id: w.id,
            name: w.name,
            latitude: w.latitude,
            longitude: w.longitude,
            demand: 0
          });
        }
      });
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-full lg:h-full bg-zinc-900 text-zinc-100 overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-amber-500" />
            Live Dispatch Tracking
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Monitor vehicle telemetry coordinates and real-time waypoint completion.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-live-map-toggle-simulation"
            onClick={handleStartSimulation}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              isSimulating 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/20' 
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'fill-amber-400 text-amber-400' : 'fill-zinc-950 text-zinc-950'}`} />
            <span>{isSimulating ? 'Pause Dispatch' : 'Simulate Live Dispatch'}</span>
          </button>
          <button
            id="btn-live-map-reset-simulation"
            onClick={handleResetSimulation}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left Side: Status Pane */}
        <div className="w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/20 shrink-0 p-4 sm:p-6 space-y-6 overflow-y-auto">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Fleet Positions</label>
          
          {simulatedDrivers.length === 0 ? (
            <div className="flex-1 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-xs min-h-[140px]">
              <Compass className="w-8 h-8 text-zinc-700 mb-3 animate-spin" style={{ animationDuration: '6s' }} />
              <p className="text-zinc-400 font-bold">No Active Telemetry</p>
              <p className="text-zinc-500 mt-1 max-w-[200px]">Click "Simulate Live Dispatch" to start real-time vehicle coordinate updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {simulatedDrivers.map((drv, idx) => {
                const totalCoords = drv.coordinates.length;
                const completedPercent = Math.min(100, Math.round((drv.progressIndex / (totalCoords - 1 || 1)) * 100));

                return (
                  <div key={drv.driver_id} className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: mapColors[idx % mapColors.length] }} 
                        />
                        <span className="text-xs font-bold text-zinc-200">{drv.vehicle_plate}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 font-mono">{completedPercent}%</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Driver:</span>
                        <span className="font-semibold text-zinc-300">{drv.driver_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Coordinates:</span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {drv.latitude.toFixed(4)}, {drv.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Speed:</span>
                        <span className="font-semibold text-amber-400">{drv.speed.toFixed(1)} km/h</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-850">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${completedPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Map Canvas */}
        <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-0 relative">
          <MapComponent
            center={[6.5244, 3.3792]} // Lagos
            zoom={12}
            stops={mapStops}
            depot={[6.5244, 3.3792]}
            routes={mapRoutes}
            liveDrivers={liveDrivers}
          />
        </div>
      </div>
    </div>
  );
}
