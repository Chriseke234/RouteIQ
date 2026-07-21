'use client';

import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  UserSquare2, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { fleetService, Vehicle, Driver } from '@/utils/fleetService';

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [loading, setLoading] = useState(true);

  // Forms states
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [editingDriver, setEditingDriver] = useState<Partial<Driver> | null>(null);
  
  const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, 'id'>>({
    plate_number: '',
    model: '',
    capacity_kg: 1000,
    status: 'active',
  });

  const [newDriver, setNewDriver] = useState<Omit<Driver, 'id'>>({
    full_name: '',
    phone: '',
    license_number: '',
    vehicle_id: '',
  });

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [v, d] = await Promise.all([
          fleetService.getVehicles(),
          fleetService.getDrivers(),
        ]);
        setVehicles(v);
        setDrivers(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate_number || !newVehicle.model) {
      alert('Please fill all required fields');
      return;
    }
    const added = await fleetService.saveVehicle(newVehicle);
    setVehicles([...vehicles, added]);
    setNewVehicle({ plate_number: '', model: '', capacity_kg: 1000, status: 'active' });
    setShowVehicleForm(false);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (confirm('Are you sure you want to remove this vehicle?')) {
      await fleetService.deleteVehicle(id);
      setVehicles(vehicles.filter(v => v.id !== id));
      
      // Update local driver vehicle associations if affected
      const updatedDrivers = drivers.map(d => {
        if (d.vehicle_id === id) {
          return { ...d, vehicle_id: null };
        }
        return d;
      });
      setDrivers(updatedDrivers);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.full_name || !newDriver.phone || !newDriver.license_number) {
      alert('Please fill all required fields');
      return;
    }
    const added = await fleetService.saveDriver({
      ...newDriver,
      vehicle_id: newDriver.vehicle_id || null
    });
    setDrivers([...drivers, added]);
    setNewDriver({ full_name: '', phone: '', license_number: '', vehicle_id: '' });
    setShowDriverForm(false);
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Are you sure you want to delete this driver profile?')) {
      await fleetService.deleteDriver(id);
      setDrivers(drivers.filter(d => d.id !== id));
    }
  };

  const updateVehicleStatus = async (id: string, status: Vehicle['status']) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      const updated = await fleetService.saveVehicle({ ...vehicle, status });
      setVehicles(vehicles.map(v => v.id === id ? updated : v));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-zinc-400">Loading Fleet Management Panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 bg-zinc-900 text-zinc-100 overflow-y-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Fleet Management</h1>
          <p className="text-sm text-zinc-400">Register trucks, add drivers, and configure asset allocation.</p>
        </div>
        
        {/* Tab Controls */}
        <div className="flex items-center bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shrink-0">
          <button
            id="btn-fleet-tab-vehicles"
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'vehicles'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Vehicles</span>
          </button>
          <button
            id="btn-fleet-tab-drivers"
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'drivers'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserSquare2 className="w-4 h-4" />
            <span>Drivers</span>
          </button>
        </div>
      </div>

      {activeTab === 'vehicles' ? (
        // --- VEHICLES TAB ---
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Registered Trucks</h3>
            <button
              id="btn-fleet-toggle-vehicle-form"
              onClick={() => setShowVehicleForm(!showVehicleForm)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>Register Vehicle</span>
            </button>
          </div>

          {/* New Vehicle Form */}
          {showVehicleForm && (
            <form onSubmit={handleAddVehicle} className="p-6 bg-zinc-950/60 border border-zinc-800 rounded-2xl grid gap-4 sm:grid-cols-4 items-end max-w-4xl">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Plate Number</label>
                <input 
                  type="text" 
                  required
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                  placeholder="e.g. LAG-492-AA"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Model</label>
                <input 
                  type="text" 
                  required
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  placeholder="e.g. Toyota Dyna"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Load Capacity (kg)</label>
                <input 
                  type="number" 
                  required
                  value={newVehicle.capacity_kg}
                  onChange={(e) => setNewVehicle({ ...newVehicle, capacity_kg: Number(e.target.value) })}
                  placeholder="e.g. 1500"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition"
                >
                  Save
                </button>
                <button 
                  type="button"
                  onClick={() => setShowVehicleForm(false)}
                  className="px-3 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded-lg transition border border-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Vehicles List Table */}
          <div className="bg-zinc-950/30 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400">
                    <th className="p-4">Truck Plate</th>
                    <th className="p-4">Model Description</th>
                    <th className="p-4">Payload Capacity</th>
                    <th className="p-4">Operational Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-sm">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-900/10">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400 shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="font-extrabold text-zinc-200 font-mono">{v.plate_number}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-zinc-300">{v.model}</td>
                      <td className="p-4 font-medium text-zinc-400">{v.capacity_kg.toLocaleString()} kg</td>
                      <td className="p-4">
                        <select
                          value={v.status}
                          onChange={(e) => updateVehicleStatus(v.id, e.target.value as any)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border bg-zinc-900 focus:outline-none cursor-pointer ${
                            v.status === 'active' 
                              ? 'text-emerald-400 border-emerald-500/20'
                              : v.status === 'maintenance'
                              ? 'text-amber-400 border-amber-500/20'
                              : 'text-zinc-500 border-zinc-800'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="offline">Offline</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // --- DRIVERS TAB ---
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Registered Drivers</h3>
            <button
              id="btn-fleet-toggle-driver-form"
              onClick={() => setShowDriverForm(!showDriverForm)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>Add Driver Profile</span>
            </button>
          </div>

          {/* New Driver Form */}
          {showDriverForm && (
            <form onSubmit={handleAddDriver} className="p-6 bg-zinc-950/60 border border-zinc-800 rounded-2xl grid gap-4 sm:grid-cols-4 items-end max-w-4xl">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newDriver.full_name}
                  onChange={(e) => setNewDriver({ ...newDriver, full_name: e.target.value })}
                  placeholder="e.g. Babajide Okafor"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Phone Number</label>
                <input 
                  type="text" 
                  required
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  placeholder="e.g. +234 803 111 2222"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">License Number</label>
                <input 
                  type="text" 
                  required
                  value={newDriver.license_number}
                  onChange={(e) => setNewDriver({ ...newDriver, license_number: e.target.value })}
                  placeholder="e.g. LA-99281-A"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Assign Vehicle</label>
                <select
                  value={newDriver.vehicle_id || ''}
                  onChange={(e) => setNewDriver({ ...newDriver, vehicle_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-lg text-zinc-100 focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number} ({v.model})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 sm:col-span-4 justify-end">
                <button 
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition"
                >
                  Add Driver
                </button>
                <button 
                  type="button"
                  onClick={() => setShowDriverForm(false)}
                  className="px-4 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded-lg transition border border-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Drivers List Table */}
          <div className="bg-zinc-950/30 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400">
                    <th className="p-4">Driver Name</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">License Number</th>
                    <th className="p-4">Assigned Vehicle</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-sm">
                  {drivers.map((d) => {
                    const vehicle = vehicles.find(v => v.id === d.vehicle_id);

                    return (
                      <tr key={d.id} className="hover:bg-zinc-900/10">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400 shrink-0">
                              <UserSquare2 className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-zinc-200">{d.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-zinc-400 font-medium">{d.phone}</td>
                        <td className="p-4 font-mono text-xs text-zinc-500">{d.license_number}</td>
                        <td className="p-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                            vehicle 
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 font-mono'
                              : 'bg-zinc-900/20 border-zinc-800 text-zinc-600'
                          }`}>
                            {vehicle ? `${vehicle.plate_number}` : 'No vehicle assigned'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteDriver(d.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
