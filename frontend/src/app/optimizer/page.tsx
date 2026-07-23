'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Play, 
  MapPin, 
  Truck, 
  Plus, 
  Trash2, 
  Map, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { fleetService, Vehicle, Driver, Trip, Waypoint } from '@/utils/fleetService';

// Dynamic import of map component to avoid NextJS SSR window issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-zinc-950 flex items-center justify-center rounded-2xl border border-zinc-800">
      <span className="text-zinc-500 font-semibold animate-pulse">Loading Map Engine...</span>
    </div>
  )
});

interface LocalStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demand: number;
}

export default function OptimizerPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stops, setStops] = useState<LocalStop[]>([]);
  
  // Custom Overlays
  const [enableOverlays, setEnableOverlays] = useState(true);
  const [degradedCorridors, setDegradedCorridors] = useState<{ id: string; coordinates: [number, number][] }[]>([]);
  const [checkpoints, setCheckpoints] = useState<{ id: string; latitude: number; longitude: number }[]>([]);
  const [floodPolygons, setFloodPolygons] = useState<{ id: string; coordinates: [number, number][] }[]>([]);
  
  const [clickMode, setClickMode] = useState<'stop' | 'checkpoint' | 'none'>('stop');
  const [depot, setDepot] = useState<[number, number]>([6.5244, 3.3792]); // Lagos Port Depot
  
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  
  const [newStopName, setNewStopName] = useState('');
  const [newStopDemand, setNewStopDemand] = useState<number>(100);

  // Load Vehicles & Drivers
  useEffect(() => {
    async function loadData() {
      const v = await fleetService.getVehicles();
      const d = await fleetService.getDrivers();
      setVehicles(v);
      setDrivers(d);
      
      // Auto-select active vehicles by default
      const activeIds = v.filter(x => x.status === 'active').map(x => x.id);
      setSelectedVehicleIds(activeIds);
    }
    loadData();
  }, []);

  // Pre-populate Lagos Demo Scenario
  const loadLagosDemoScenario = () => {
    setDepot([6.5244, 3.3792]); // Lagos Port, Apapa
    
    setStops([
      { id: 'stop-1', name: 'Ikeja Mall Delivery', latitude: 6.6018, longitude: 3.3515, demand: 450 },
      { id: 'stop-2', name: 'Victoria Island Hub', latitude: 6.4281, longitude: 3.4219, demand: 600 },
      { id: 'stop-3', name: 'Lekki Phase 1 Dropoff', latitude: 6.4589, longitude: 3.4615, demand: 350 },
      { id: 'stop-4', name: 'Ikorodu Road Terminal', latitude: 6.5924, longitude: 3.3722, demand: 550 },
      { id: 'stop-5', name: 'Yaba Fulfillment Center', latitude: 6.5185, longitude: 3.3785, demand: 250 },
      { id: 'stop-6', name: 'Surulere Retail Depot', latitude: 6.5022, longitude: 3.3589, demand: 300 },
    ]);

    // Ikorodu Road Degraded Corridor: [lat, lon] format for map
    setDegradedCorridors([
      {
        id: 'corridor-1',
        coordinates: [
          [6.5500, 3.3650],
          [6.5900, 3.3650],
          [6.5900, 3.3800],
          [6.5500, 3.3800],
        ]
      }
    ]);

    // Lekki coastal flood zone: [lat, lon] format for map
    setFloodPolygons([
      {
        id: 'flood-1',
        coordinates: [
          [6.4150, 3.4350],
          [6.4380, 3.4350],
          [6.4380, 3.4800],
          [6.4150, 3.4800],
        ]
      }
    ]);

    // Checkpoints: Lekki toll gate and Third mainland bridge exit
    setCheckpoints([
      { id: 'cp-1', latitude: 6.4311, longitude: 3.4422 },
      { id: 'cp-2', latitude: 6.5122, longitude: 3.3911 }
    ]);

    setOptimizationResult(null);
    setOptimizerError(null);
  };

  // Click on map to add items
  const handleMapClick = (lat: number, lon: number) => {
    if (clickMode === 'stop') {
      const id = `stop-${Math.random().toString(36).substr(2, 9)}`;
      const name = newStopName.trim() || `Delivery Stop #${stops.length + 1}`;
      const newStop: LocalStop = {
        id,
        name,
        latitude: lat,
        longitude: lon,
        demand: newStopDemand || 100,
      };
      setStops([...stops, newStop]);
      setNewStopName('');
    } else if (clickMode === 'checkpoint') {
      const id = `cp-${Math.random().toString(36).substr(2, 9)}`;
      setCheckpoints([...checkpoints, { id, latitude: lat, longitude: lon }]);
    }
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
    setOptimizationResult(null);
  };

  const clearAllStops = () => {
    setStops([]);
    setCheckpoints([]);
    setDegradedCorridors([]);
    setFloodPolygons([]);
    setOptimizationResult(null);
  };

  const toggleVehicleSelection = (id: string) => {
    if (selectedVehicleIds.includes(id)) {
      setSelectedVehicleIds(selectedVehicleIds.filter(x => x !== id));
    } else {
      setSelectedVehicleIds([...selectedVehicleIds, id]);
    }
  };

  // Run solver calling backend FastAPI
  const handleOptimize = async () => {
    if (stops.length === 0) {
      setOptimizerError('Please add at least 1 delivery stop.');
      return;
    }

    const activeVehicles = vehicles.filter(v => selectedVehicleIds.includes(v.id));
    if (activeVehicles.length === 0) {
      setOptimizerError('Please select at least 1 vehicle for routing.');
      return;
    }

    setIsOptimizing(true);
    setOptimizerError(null);
    setOptimizationResult(null);

    // Format coordinates: Depot index 0 first, then stops
    const coordinates: [number, number][] = [
      depot,
      ...stops.map(s => [s.latitude, s.longitude] as [number, number])
    ];

    const demands = [
      0, // depot has 0 demand
      ...stops.map(s => s.demand)
    ];

    const vehicle_capacities = activeVehicles.map(v => v.capacity_kg);

    // Parse overlays to [longitude, latitude] for backend compatibility
    const shapelyDegraded = enableOverlays 
      ? degradedCorridors.map(c => ({
          coordinates: c.coordinates.map(pt => [pt[1], pt[0]] as [number, number]) // convert to [lon, lat]
        }))
      : [];

    const shapelyFloods = enableOverlays
      ? floodPolygons.map(f => ({
          coordinates: f.coordinates.map(pt => [pt[1], pt[0]] as [number, number]) // convert to [lon, lat]
        }))
      : [];

    const shapelyCheckpoints = enableOverlays
      ? checkpoints.map(cp => ({
          coordinate: [cp.longitude, cp.latitude] as [number, number] // convert to [lon, lat]
        }))
      : [];

    const payload = {
      coordinates,
      demands,
      vehicle_capacities,
      degraded_corridors: shapelyDegraded,
      flood_polygons: shapelyFloods,
      checkpoints: shapelyCheckpoints,
      average_speed_mps: 13.89,
      time_limit_seconds: 5
    };

    try {
      const res = await fleetService.callOptimize(payload);
      if (res.success) {
        setOptimizationResult(res);
      } else {
        setOptimizerError(res.status || 'Routing solution search failed. Check vehicle capacities.');
      }
    } catch (e: any) {
      setOptimizerError(e.message || 'Error communicating with routing backend.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Dispatch calculated routes to drivers
  const handleDispatchTrip = async (routeIndex: number) => {
    const route = optimizationResult.routes[routeIndex];
    const activeVehicles = vehicles.filter(v => selectedVehicleIds.includes(v.id));
    const vehicle = activeVehicles[route.vehicle_id];
    
    // Find driver associated with vehicle
    const driver = drivers.find(d => d.vehicle_id === vehicle.id);
    const driverId = driver ? driver.id : null;
    const driverName = driver ? driver.full_name : 'Unassigned';

    // Map route stops to Waypoints schema
    const routeWaypoints: Waypoint[] = route.stops.map((stop: any, idx: number) => {
      // Find stop name if it was a custom stop
      let stopName = 'Depot';
      if (stop.node_index > 0) {
        stopName = stops[stop.node_index - 1].name;
      }

      return {
        id: `wp-${Math.random().toString(36).substr(2, 9)}`,
        trip_id: '', // filled below
        sequence: idx,
        name: stopName,
        latitude: stop.coordinates[0],
        longitude: stop.coordinates[1],
        status: 'pending'
      };
    });

    const tripId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    const waypointsWithTripId = routeWaypoints.map(w => ({ ...w, trip_id: tripId }));

    const trip: Trip = {
      id: tripId,
      driver_id: driverId,
      driver_name: driverName,
      vehicle_plate: vehicle.plate_number,
      status: 'assigned',
      route_geometry: JSON.stringify(route.stops.map((s: any) => s.coordinates)),
      waypoints: waypointsWithTripId
    };

    await fleetService.saveTrip(trip);
    alert(`Successfully dispatched Trip #${tripId.substring(0, 8)} to ${driverName} (${vehicle.plate_number})`);
  };

  // Map route results back to MapComponent drawing layout
  const mapColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
  const mapRoutes = optimizationResult?.routes.map((r: any, idx: number) => ({
    vehicle_id: r.vehicle_id,
    color: mapColors[idx % mapColors.length],
    stops: r.stops.map((s: any) => {
      let stopName = 'Depot';
      if (s.node_index > 0) {
        stopName = stops[s.node_index - 1].name;
      }
      return {
        coordinates: s.coordinates as [number, number],
        name: stopName,
        demand: s.demand
      };
    })
  })) || [];

  return (
    <div className="flex-1 flex flex-col min-h-full lg:h-full bg-zinc-900 text-zinc-100 overflow-y-auto lg:overflow-hidden">
      {/* Navbar/Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Route Planning Optimizer
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Add delivery targets, custom overlays, and execute the CVRP optimizer solver.</p>
        </div>
        <button 
          id="btn-optimizer-load-demo"
          onClick={loadLagosDemoScenario}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Load Lagos Demo</span>
        </button>
      </div>

      {/* Main Workspace split screen */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left Config Panel */}
        <div className="w-full lg:w-96 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/20 overflow-y-auto shrink-0 p-4 sm:p-6 space-y-6">
          {/* Controls: Click Mode selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Map Click Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-optimizer-mode-stop"
                onClick={() => setClickMode('stop')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  clickMode === 'stop'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>
              <button
                id="btn-optimizer-mode-checkpoint"
                onClick={() => setClickMode('checkpoint')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  clickMode === 'checkpoint'
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Add Checkpoint</span>
              </button>
            </div>
            {clickMode === 'stop' && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                <input 
                  id="input-optimizer-new-stop-name"
                  type="text" 
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  placeholder="Stop Name (e.g. Yaba Outlet)"
                  className="w-full bg-zinc-950 text-xs px-3 py-2 rounded-lg border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Demand (kg)</span>
                  <input 
                    id="input-optimizer-new-stop-demand"
                    type="number" 
                    value={newStopDemand}
                    onChange={(e) => setNewStopDemand(Number(e.target.value))}
                    className="w-20 bg-zinc-950 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-100 text-right focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Overlays toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Geospatial Modifiers</label>
              <input 
                id="checkbox-optimizer-enable-overlays"
                type="checkbox" 
                checked={enableOverlays}
                onChange={() => setEnableOverlays(!enableOverlays)}
                className="w-4 h-4 text-emerald-500 rounded border-zinc-800 bg-zinc-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-zinc-500">Enable delays for local checkpoints (+15m), degraded corridors (1.8x travel cost), and flooding areas (+3h).</p>
          </div>

          {/* Vehicles selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
              <span>Select Fleet Vehicles</span>
              <span className="text-[10px] text-zinc-500">{selectedVehicleIds.length} chosen</span>
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {vehicles.map((v) => (
                <div 
                  id={`div-optimizer-vehicle-${v.id}`}
                  key={v.id} 
                  onClick={() => toggleVehicleSelection(v.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedVehicleIds.includes(v.id)
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className={`w-4 h-4 ${selectedVehicleIds.includes(v.id) ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold">{v.plate_number}</span>
                      <span className="text-[10px] text-zinc-500">{v.model}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium">{v.capacity_kg}kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solve trigger button */}
          <div className="pt-2">
            <button
              id="btn-optimizer-execute-vrp"
              onClick={handleOptimize}
              disabled={isOptimizing || stops.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/5 cursor-pointer"
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin"></div>
                  <span>Computing Optimal VRP...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-zinc-950" />
                  <span>Execute VRP Optimizer</span>
                </>
              )}
            </button>
            {optimizerError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{optimizerError}</span>
              </div>
            )}
          </div>

          {/* Target stops list */}
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Stops ({stops.length})</label>
              {stops.length > 0 && (
                <button 
                  id="btn-optimizer-clear-all"
                  onClick={clearAllStops}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              )}
            </div>
            
            {stops.length === 0 ? (
              <div className="flex-1 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                <Map className="w-6 h-6 text-zinc-600 mb-2" />
                <p className="text-[11px] text-zinc-500 leading-normal">No delivery stops added yet. Draw them by clicking on the map coordinates.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
                {stops.map((stop, idx) => (
                  <div key={stop.id} className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs hover:border-zinc-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                        <span className="font-bold text-zinc-200">{stop.name}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Lat: {stop.latitude.toFixed(4)}, Lon: {stop.longitude.toFixed(4)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-400">{stop.demand}kg</span>
                      <button 
                        id={`btn-optimizer-remove-stop-${stop.id}`}
                        onClick={() => removeStop(stop.id)}
                        className="text-zinc-600 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Map Panel & Routing results */}
        <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden relative">
          {/* Map canvas */}
          <div className="flex-1 relative">
            <MapComponent
              center={depot}
              zoom={12}
              stops={stops}
              depot={depot}
              routes={mapRoutes}
              degradedCorridors={enableOverlays ? degradedCorridors : []}
              floodPolygons={enableOverlays ? floodPolygons : []}
              checkpoints={enableOverlays ? checkpoints : []}
              clickMode={clickMode}
              onMapClick={handleMapClick}
            />
          </div>

          {/* Results section */}
          {optimizationResult && (
            <div className="h-64 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-md overflow-y-auto p-6 space-y-4 shrink-0 z-[1000]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Optimization Solution Result</h3>
                  <p className="text-xs text-zinc-400">Total travel duration: {Math.round(optimizationResult.total_time_seconds / 60)} minutes.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Optimal Solution Found</span>
                </div>
              </div>

              {/* List of generated routes */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {optimizationResult.routes.map((route: any, idx: number) => {
                  const activeVehicles = vehicles.filter(v => selectedVehicleIds.includes(v.id));
                  const vehicle = activeVehicles[route.vehicle_id];
                  
                  return (
                    <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-200">Route #{idx + 1}</span>
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: mapColors[idx % mapColors.length] }} 
                          />
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Vehicle:</span>
                            <span className="font-semibold text-zinc-300">{vehicle?.plate_number || `Vehicle ${route.vehicle_id}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Stops visited:</span>
                            <span className="font-semibold text-zinc-300">{route.stops.length - 2} stops</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Capacity Load:</span>
                            <span className={`font-semibold ${route.load > vehicle?.capacity_kg ? 'text-red-400' : 'text-zinc-300'}`}>
                              {route.load} / {vehicle?.capacity_kg || 0} kg
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Est. Duration:</span>
                            <span className="font-semibold text-zinc-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {Math.round(route.duration_seconds / 60)} mins
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        id={`btn-optimizer-dispatch-route-${idx}`}
                        onClick={() => handleDispatchTrip(idx)}
                        className="w-full py-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 hover:border-transparent rounded-lg transition"
                      >
                        Dispatch assigned route
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
