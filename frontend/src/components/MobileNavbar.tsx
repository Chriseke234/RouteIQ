'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MapPin, 
  Navigation, 
  Truck, 
  UserSquare2, 
  Layers,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { OPTIMIZER_API_URL } from '@/utils/supabase';

const getOptimizerHost = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch (e) {
    return url.replace(/^https?:\/\//, '');
  }
};

export default function MobileNavbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Optimizer', href: '/optimizer', icon: Navigation },
    { name: 'Live Map', href: '/live-map', icon: MapPin },
    { name: 'Fleet', href: '/fleet', icon: Truck },
    { name: 'Driver', href: '/driver', icon: UserSquare2 },
  ];

  return (
    <>
      {/* Top Mobile Header Bar (<768px) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-teal-500/20">
            <Layers className="w-4 h-4 text-zinc-950 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">RouteIQ</h1>
            <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest block">Geospatial VRP</span>
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {drawerOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Slide-out Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-teal-500/20">
                <Layers className="w-5 h-5 text-zinc-950 font-bold" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">RouteIQ</h1>
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest block mt-1">Geospatial VRP</span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            >
              <X className="w-5 h-5 text-emerald-400" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between px-4 py-3.5 text-base font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-300">FastAPI Solver</span>
                <span className="text-[10px] text-zinc-500">Connected to {getOptimizerHost(OPTIMIZER_API_URL)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar (<768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 py-1.5 px-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 scale-110' : 'text-zinc-400'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
