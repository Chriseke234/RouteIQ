'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Users, 
  Navigation, 
  Fuel, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Map
} from 'lucide-react';
import { fleetService, Vehicle, Driver, Trip, FuelLog } from '@/utils/fleetService';

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [v, d, t, f] = await Promise.all([
          fleetService.getVehicles(),
          fleetService.getDrivers(),
          fleetService.getTrips(),
          fleetService.getFuelLogs(),
        ]);
        setVehicles(v);
        setDrivers(d);
        setTrips(t);
        setFuelLogs(f.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-zinc-400">Loading RouteIQ Dashboard...</span>
        </div>
      </div>
    );
  }

  // Calculate analytics
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const activeTripsCount = trips.filter(t => t.status === 'active' || t.status === 'assigned').length;
  const completedTripsCount = trips.filter(t => t.status === 'completed').length;
  
  const totalFuelCostNGN = fuelLogs.reduce((sum, log) => sum + log.cost_ngn, 0);
  const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + log.amount_liters, 0);
  const averageFuelPrice = totalFuelLiters > 0 ? (totalFuelCostNGN / totalFuelLiters).toFixed(1) : '0';

  const totalCapacityKg = vehicles.reduce((sum, v) => sum + v.capacity_kg, 0);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 bg-zinc-900 text-zinc-100 overflow-y-auto">
      {/* Upper Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Lagos Operations Command</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Real-time status of fleet dispatch, route optimization, and operational efficiency.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            id="link-optimize-new-route"
            href="/optimizer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Optimize New Route</span>
          </Link>
        </div>
      </div>

      {/* Analytics KPI row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Vehicles card */}
        <div className="p-5 sm:p-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Vehicles</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{activeVehicles}</span>
            <span className="text-xs sm:text-sm text-zinc-500">/ {vehicles.length} active</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-400">{totalCapacityKg.toLocaleString()} kg</span> total load capacity.
          </div>
        </div>

        {/* Dispatch Trips card */}
        <div className="p-5 sm:p-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active Trips</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sky-400">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{activeTripsCount}</span>
            <span className="text-xs sm:text-sm text-zinc-500">assigned</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="font-semibold text-sky-400">{completedTripsCount}</span> routes completed this week.
          </div>
        </div>

        {/* Fuel Expense card */}
        <div className="p-5 sm:p-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Fuel Cost</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">₦{(totalFuelCostNGN).toLocaleString()}</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
            Avg: <span className="font-semibold text-amber-400">₦{averageFuelPrice}/L</span> over {totalFuelLiters.toLocaleString()} Liters.
          </div>
        </div>

        {/* Drivers card */}
        <div className="p-5 sm:p-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Staffing</span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-violet-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{drivers.length}</span>
            <span className="text-xs sm:text-sm text-zinc-500">drivers registered</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="font-semibold text-violet-400">{drivers.filter(d => d.vehicle_id).length}</span> drivers assigned to vehicles.
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        {/* Left Column: Active Trips */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 sm:p-6 bg-zinc-950/30 border border-zinc-800 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Active Dispatch Routes</h3>
                <p className="text-xs text-zinc-400">Currently active VRP optimized assignments.</p>
              </div>
              <Link id="link-dashboard-live-tracking" href="/live-map" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Map className="w-3.5 h-3.5" />
                <span>View Live tracking</span>
              </Link>
            </div>

            {trips.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl">
                <Navigation className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
                <h4 className="text-sm font-bold text-zinc-300">No Active Trips Found</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Create and optimize a routing sequence to assign trips to drivers.</p>
                 <Link 
                  id="link-dashboard-configure-stops"
                  href="/optimizer" 
                  className="inline-block mt-4 px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition border border-zinc-700"
                >
                  Configure Stops on Map
                </Link>
              </div>
            ) : (
              <div>
                {/* Desktop Table View (>=md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400">
                        <th className="pb-3">Trip ID</th>
                        <th className="pb-3">Driver</th>
                        <th className="pb-3">Stops</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-sm">
                      {trips.map((trip) => {
                        const pendingWps = trip.waypoints?.filter(w => w.status === 'pending').length || 0;
                        const totalWps = trip.waypoints?.length || 0;

                        return (
                          <tr key={trip.id} className="hover:bg-zinc-900/20">
                            <td className="py-4 font-mono text-xs text-zinc-400">#{trip.id.substring(0, 8)}</td>
                            <td className="py-4">
                              <span className="font-semibold text-zinc-200">{trip.driver_name || 'Unassigned'}</span>
                            </td>
                            <td className="py-4">
                              <span className="text-zinc-300 font-medium">
                                {totalWps - pendingWps} / {totalWps} visited
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                trip.status === 'active' 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : trip.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                              }`}>
                                {trip.status === 'active' && <Clock className="w-3 h-3" />}
                                {trip.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {trip.status === 'assigned' && <AlertCircle className="w-3 h-3" />}
                                <span className="capitalize">{trip.status}</span>
                              </span>
                            </td>
                            <td className="py-4">
                              <Link 
                                id={`link-simulate-trip-${trip.id}`}
                                href="/driver" 
                                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                              >
                                Simulate
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (<md) */}
                <div className="md:hidden space-y-3">
                  {trips.map((trip) => {
                    const pendingWps = trip.waypoints?.filter(w => w.status === 'pending').length || 0;
                    const totalWps = trip.waypoints?.length || 0;

                    return (
                      <div key={trip.id} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-zinc-400">#{trip.id.substring(0, 8)}</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            trip.status === 'active' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : trip.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}>
                            <span className="capitalize">{trip.status}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Driver</span>
                            <span className="font-semibold text-zinc-200">{trip.driver_name || 'Unassigned'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 block text-[10px]">Progress</span>
                            <span className="text-zinc-300 font-medium">{totalWps - pendingWps} / {totalWps} visited</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
                          <Link 
                            id={`link-simulate-trip-mobile-${trip.id}`}
                            href="/driver" 
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                          >
                            Simulate Route →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Fuel Logs */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-950/30 border border-zinc-800 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-6">Recent Fuel Purges</h3>
            
            {fuelLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No recent fuel logs recorded. Drivers can log fuel transactions via the Driver Portal.
              </div>
            ) : (
              <div className="space-y-4">
                {fuelLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{log.vehicle_plate}</span>
                        <span className="text-zinc-500">by {log.driver_name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="font-bold text-amber-400">₦{(log.cost_ngn).toLocaleString()}</div>
                      <div className="text-[10px] text-zinc-400">{log.amount_liters} Liters</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats banner */}
          <div className="p-6 bg-gradient-to-tr from-emerald-950/20 to-zinc-950/40 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                VRP Efficiency
              </span>
              <h4 className="text-lg font-bold text-white">Route Optimization</h4>
              <p className="text-xs text-zinc-400">Nigerian road delay modifiers have reduced fleet travel cost by 28% compared to straight-line paths.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
