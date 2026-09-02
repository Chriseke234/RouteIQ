'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  UserSquare2, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Navigation, 
  Fuel, 
  AlertCircle,
  Truck,
  Phone,
  Calendar,
  Compass,
  ArrowRight
} from 'lucide-react';
import { fleetService, Trip, Driver, Waypoint } from '@/utils/fleetService';

// Dynamic import for MapComponent (SSR safe)
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-zinc-950 flex items-center justify-center rounded-2xl border border-zinc-800">
      <span className="text-zinc-500 font-semibold animate-pulse text-xs">Loading Live Navigation Map...</span>
    </div>
  )
});

export default function DriverPortalPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Fuel Log form states
  const [liters, setLiters] = useState<number>(0);
  const [costNgn, setCostNgn] = useState<number>(0);
  const [showFuelModal, setShowFuelModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      const d = await fleetService.getDrivers();
      setDrivers(d);
      if (d.length > 0) {
        setSelectedDriverId(d[0].id);
      }
      
      const t = await fleetService.getTrips();
      setTrips(t);
    }
    loadData();
  }, []);

  // Update active trip whenever selected driver or trips list changes
  useEffect(() => {
    if (!selectedDriverId) {
      setActiveTrip(null);
      return;
    }
    const currentTrip = trips.find(
      t => t.driver_id === selectedDriverId && t.status !== 'completed'
    );
    setActiveTrip(currentTrip || null);
  }, [selectedDriverId, trips]);

  const handleDriverChange = (id: string) => {
    setSelectedDriverId(id);
  };

  const handleUpdateWaypoint = async (wpId: string, status: Waypoint['status']) => {
    if (!activeTrip) return;
    
    await fleetService.updateWaypointStatus(activeTrip.id, wpId, status);
    
    // Update local state
    const updatedTrips = await fleetService.getTrips();
    setTrips(updatedTrips);
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    
    if (confirm('Complete this trip? This will archive the route and mark all pending waypoints as visited.')) {
      // Mark any remaining waypoints as visited
      if (activeTrip.waypoints) {
        for (const wp of activeTrip.waypoints) {
          if (wp.status === 'pending') {
            await fleetService.updateWaypointStatus(activeTrip.id, wp.id, 'visited');
          }
        }
      }

      await fleetService.updateTripStatus(activeTrip.id, 'completed');
      
      const updatedTrips = await fleetService.getTrips();
      setTrips(updatedTrips);
      alert('Trip successfully completed!');
    }
  };

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || liters <= 0 || costNgn <= 0) {
      alert('Please enter valid fuel amount and cost.');
      return;
    }

    const driver = drivers.find(d => d.id === selectedDriverId);
    if (!driver || !driver.vehicle_id) return;

    await fleetService.addFuelLog({
      vehicle_id: driver.vehicle_id,
      driver_id: selectedDriverId,
      amount_liters: liters,
      cost_ngn: costNgn,
      timestamp: new Date().toISOString(),
      latitude: 6.5244 + (Math.random() - 0.5) * 0.05,
      longitude: 3.3792 + (Math.random() - 0.5) * 0.05
    });

    setLiters(0);
    setCostNgn(0);
    setShowFuelModal(false);
    alert('Fuel purchase successfully logged!');
  };

  const currentDriver = drivers.find(d => d.id === selectedDriverId);

  // Format waypoints for MapComponent stops display
  const mapStops = activeTrip?.waypoints?.map(wp => ({
    id: wp.id,
    name: wp.name,
    latitude: wp.latitude,
    longitude: wp.longitude,
    demand: 0
  })) || [];

  // Map route polyline points
  let mapRoutes: any[] = [];
  if (activeTrip) {
    let stops: any[] = [];
    try {
      if (activeTrip.route_geometry) {
        const coords = JSON.parse(activeTrip.route_geometry);
        stops = coords.map((c: any) => ({
          coordinates: c as [number, number],
          name: '',
          demand: 0
        }));
      }
    } catch (e) {
      // Fallback to waypoints
    }
    if (stops.length === 0 && activeTrip.waypoints) {
      stops = activeTrip.waypoints.map(w => ({
        coordinates: [w.latitude, w.longitude] as [number, number],
        name: w.name,
        demand: 0
      }));
    }
    mapRoutes = [{
      vehicle_id: 1,
      color: '#10b981',
      stops
    }];
  }

  // Calculate stats
  const totalWaypoints = activeTrip?.waypoints?.length || 0;
  const visitedCount = activeTrip?.waypoints?.filter(w => w.status === 'visited').length || 0;
  const progressPercent = totalWaypoints > 0 ? Math.round((visitedCount / totalWaypoints) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-full lg:h-full bg-zinc-900 text-zinc-100 overflow-y-auto lg:overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <UserSquare2 className="w-5 h-5 text-emerald-400" />
            Driver Dispatch Portal
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Field driver navigation terminal, waypoint checklist, and fuel logging.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Driver Profile Switcher */}
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden xs:inline">Driver Profile:</span>
            <select
              id="select-driver-sim-profile"
              value={selectedDriverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-zinc-950 text-zinc-300">Select Driver</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id} className="bg-zinc-950 text-zinc-300">{d.full_name}</option>
              ))}
            </select>
          </div>

          {activeTrip && (
            <div className="flex items-center gap-2">
              <button
                id="btn-driver-sim-show-fuel-modal"
                onClick={() => setShowFuelModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/20 rounded-xl transition cursor-pointer"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>Log Diesel Refill</span>
              </button>
              <button
                id="btn-driver-sim-complete-trip"
                onClick={handleCompleteTrip}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Mark Arrived</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left Panel: Driver Profile & Active Manifest */}
        <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/40 shrink-0 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Driver Info Card */}
          {currentDriver ? (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold text-sm">
                    {currentDriver.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{currentDriver.full_name}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-zinc-500" />
                      {currentDriver.phone || '+234 800 000 0000'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    activeTrip 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-zinc-850 text-zinc-400 border-zinc-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeTrip ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                    {activeTrip ? 'En Route' : 'Idle'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-850 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Assigned Vehicle</span>
                  <span className="font-bold text-zinc-200 font-mono flex items-center gap-1.5 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-400" />
                    {currentDriver.vehicle_plate || currentDriver.license_number || 'TRUCK-LAG-101'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Trip Progress</span>
                  <span className="font-bold text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    {progressPercent}% ({visitedCount}/{totalWaypoints} Stops)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-850">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-400">
              Please select a driver profile above.
            </div>
          )}

          {/* Active Manifest Section */}
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                Dispatched Waypoint Manifest
              </label>
              {activeTrip && (
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full capitalize">
                  {activeTrip.status}
                </span>
              )}
            </div>

            {activeTrip ? (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {activeTrip.waypoints?.map((wp, idx) => (
                  <div 
                    key={wp.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      wp.status === 'visited'
                        ? 'bg-emerald-950/10 border-emerald-500/20 text-zinc-400'
                        : wp.status === 'skipped'
                        ? 'bg-red-950/5 border-red-500/15 text-zinc-500'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-200 shadow-md hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          wp.status === 'visited'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : wp.status === 'skipped'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-750'
                        }`}>
                          {idx === 0 ? 'D' : idx === (activeTrip.waypoints?.length || 0) - 1 ? 'D' : idx}
                        </span>

                        <div className="space-y-1">
                          <h4 className="font-bold text-xs text-white leading-tight">{wp.name}</h4>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                            <span>Lat: {wp.latitude.toFixed(4)}</span>
                            <span>Lng: {wp.longitude.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {wp.status === 'pending' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateWaypoint(wp.id, 'visited')}
                            title="Mark Visited"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 transition cursor-pointer text-xs font-semibold"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Arrived</span>
                          </button>
                          <button
                            onClick={() => handleUpdateWaypoint(wp.id, 'skipped')}
                            title="Skip Stop"
                            className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500 hover:text-zinc-950 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          wp.status === 'visited' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {wp.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-2xl text-center space-y-3">
                <Navigation className="w-8 h-8 text-zinc-700 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-300">No Dispatched Routes</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">This driver profile currently has no active optimized trip assigned today.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Interactive Live Map & Instructions */}
        <div className="flex-1 flex flex-col min-h-[450px] lg:min-h-0 p-4 sm:p-6 space-y-4">
          {/* Top Info Banner */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Field Simulation Instructions</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Use this interface to emulate driver interactions, check off arrival waypoints, and record diesel expenses in real-time.</p>
              </div>
            </div>

            {activeTrip && (
              <button
                onClick={() => setShowFuelModal(true)}
                className="w-full sm:w-auto px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>Log Diesel</span>
              </button>
            )}
          </div>

          {/* Map Display */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 min-h-[350px]">
            <MapComponent
              center={[6.5244, 3.3792]}
              zoom={12}
              stops={mapStops}
              depot={[6.5244, 3.3792]}
              routes={mapRoutes}
            />
          </div>
        </div>
      </div>

      {/* Fuel Log Modal Overlay */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddFuelLog}
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <span className="text-base font-extrabold text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" />
                Log Diesel Refill Transaction
              </span>
              <button 
                id="btn-driver-sim-close-fuel-modal"
                type="button" 
                onClick={() => setShowFuelModal(false)}
                className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Fuel Purchased (Liters) <span className="text-[10px] text-amber-400 font-normal">(@ ₦1,300 / Liter)</span>
                </label>
                <input 
                  id="input-driver-sim-fuel-liters"
                  type="number" 
                  required
                  value={liters || ''}
                  onChange={(e) => {
                    const l = Number(e.target.value);
                    setLiters(l);
                    setCostNgn(l * 1300);
                  }}
                  placeholder="e.g. 50"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-3 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Total Cost (₦ Naira NGN)</label>
                <input 
                  id="input-driver-sim-fuel-cost"
                  type="number" 
                  required
                  value={costNgn || ''}
                  onChange={(e) => setCostNgn(Number(e.target.value))}
                  placeholder="e.g. 65000"
                  className="w-full bg-zinc-900 border border-zinc-800 text-sm px-4 py-3 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold text-xs rounded-xl border border-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-driver-sim-submit-fuel"
                type="submit"
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Submit Transaction
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
