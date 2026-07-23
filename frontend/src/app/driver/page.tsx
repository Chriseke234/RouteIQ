'use client';

import React, { useEffect, useState } from 'react';
import { 
  UserSquare2, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Navigation, 
  Fuel, 
  DollarSign, 
  AlertCircle,
  Truck
} from 'lucide-react';
import { fleetService, Trip, Driver, Waypoint } from '@/utils/fleetService';

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
      // Mock Lagos location coordinates for fuel stop
      latitude: 6.5244 + (Math.random() - 0.5) * 0.05,
      longitude: 3.3792 + (Math.random() - 0.5) * 0.05
    });

    setLiters(0);
    setCostNgn(0);
    setShowFuelModal(false);
    alert('Fuel purchase successfully logged!');
  };

  const currentDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-zinc-900 overflow-y-auto">
      <h1 className="sr-only">Driver Simulation Portal</h1>
      {/* Mobile viewport frame simulation container */}
      <div className="w-full max-w-sm h-[calc(100vh-6rem)] min-h-[550px] sm:h-[750px] max-h-[780px] bg-zinc-950 border border-zinc-800 rounded-[28px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative border-4 border-zinc-800">
        
        {/* Speaker notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-zinc-800 rounded-full z-20" />

        {/* Mobile screen header */}
        <div className="pt-8 pb-4 px-6 bg-zinc-900 border-b border-zinc-850 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Driver Device View</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          <select
            id="select-driver-sim-profile"
            value={selectedDriverId}
            onChange={(e) => handleDriverChange(e.target.value)}
            className="w-full bg-zinc-950 text-xs px-3 py-2.5 rounded-xl border border-zinc-800 font-semibold text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
          >
            <option value="" disabled>Select Driver Profile</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>

        {/* Mobile content scrollable area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {currentDriver && (
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-zinc-400">Assigned Vehicle</h4>
                <p className="text-sm font-bold text-zinc-200 font-mono">
                  {drivers.find(d => d.id === selectedDriverId)?.phone ? (
                    drivers.find(d => d.id === selectedDriverId)?.license_number
                  ) : 'None'}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-emerald-400">
                <Truck className="w-4 h-4" />
              </div>
            </div>
          )}

          {activeTrip ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Waypoint List</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full capitalize">
                  {activeTrip.status}
                </span>
              </div>

              {/* Waypoints sequence checklist */}
              <div className="space-y-3">
                {activeTrip.waypoints?.map((wp, idx) => (
                  <div 
                    key={wp.id} 
                    className={`p-3.5 rounded-2xl border transition ${
                      wp.status === 'visited'
                        ? 'bg-emerald-950/10 border-emerald-500/20 text-zinc-400'
                        : wp.status === 'skipped'
                        ? 'bg-red-950/5 border-red-500/15 text-zinc-500'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                          wp.status === 'visited'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : wp.status === 'skipped'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-zinc-950 text-zinc-400'
                        }`}>
                          {idx === 0 ? 'D' : idx === (activeTrip.waypoints?.length || 0) - 1 ? 'D' : idx}
                        </span>
                        <div>
                          <h5 className="font-semibold text-xs leading-none">{wp.name}</h5>
                          <span className="text-[9px] text-zinc-500">Lat: {wp.latitude.toFixed(4)}, Lng: {wp.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                      
                      {/* Check off buttons */}
                      {wp.status === 'pending' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateWaypoint(wp.id, 'visited')}
                            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateWaypoint(wp.id, 'skipped')}
                            className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500 hover:text-zinc-950 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          wp.status === 'visited' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {wp.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Complete Trip and Log Fuel buttons */}
              <div className="pt-2 grid grid-cols-2 gap-3 shrink-0">
                <button
                  id="btn-driver-sim-show-fuel-modal"
                  onClick={() => setShowFuelModal(true)}
                  className="py-2.5 text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span>Log Fuel</span>
                </button>
                <button
                  id="btn-driver-sim-complete-trip"
                  onClick={handleCompleteTrip}
                  className="py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Arrived</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-zinc-850 rounded-3xl space-y-4">
              <Navigation className="w-10 h-10 text-zinc-700 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-zinc-300">No Dispatched Routes</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">You do not have any active optimized trips assigned to your profile today.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Overlay for Logging Fuel */}
        {showFuelModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-35 flex items-end justify-center">
            <form 
              onSubmit={handleAddFuelLog}
              className="w-full bg-zinc-900 border-t border-zinc-800 rounded-t-[30px] p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <span className="text-sm font-extrabold text-zinc-200 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  Log Diesel Refill
                </span>
                <button 
                  id="btn-driver-sim-close-fuel-modal"
                  type="button" 
                  onClick={() => setShowFuelModal(false)}
                  className="p-1 rounded-full bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-zinc-200"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Fuel Purchased (Liters)</label>
                  <input 
                    id="input-driver-sim-fuel-liters"
                    type="number" 
                    required
                    value={liters || ''}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="w-full bg-zinc-950 border border-zinc-850 text-xs px-3 py-2.5 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Total Cost (₦ Naira NGN)</label>
                  <input 
                    id="input-driver-sim-fuel-cost"
                    type="number" 
                    required
                    value={costNgn || ''}
                    onChange={(e) => setCostNgn(Number(e.target.value))}
                    placeholder="e.g. 32500"
                    className="w-full bg-zinc-950 border border-zinc-850 text-xs px-3 py-2.5 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <button
                id="btn-driver-sim-submit-fuel"
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition"
              >
                Submit Transaction
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Auxiliary Instructions panel on right of phone frame */}
      <div className="hidden md:block md:w-80 ml-8 space-y-6">
        <div className="p-6 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            Driver Simulation Instruction
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This panel simulates the mobile app used by drivers in the field. 
          </p>
          <ul className="text-xs text-zinc-500 space-y-2 list-disc list-inside">
            <li>Select a driver from the dropdown.</li>
            <li>Observe their dispatched trip waypoints list.</li>
            <li>Tap the checkmark <span className="text-emerald-400">✓</span> to mark stops visited.</li>
            <li>Log diesel purchases in Naira. Your transactions will instantly populate the Fleet Manager Dashboard statistics!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
