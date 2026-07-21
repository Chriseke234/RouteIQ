'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MapPin, 
  Navigation, 
  Truck, 
  UserSquare2, 
  Layers,
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


interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Route Optimizer', href: '/optimizer', icon: Navigation },
    { name: 'Live Map', href: '/live-map', icon: MapPin },
    { name: 'Fleet Management', href: '/fleet', icon: Truck },
    { name: 'Driver Portal', href: '/driver', icon: UserSquare2 },
  ];

  return (
    <aside className={`flex flex-col w-64 bg-zinc-950 text-zinc-100 border-r border-zinc-800 shrink-0 h-screen sticky top-0 ${className}`}>
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-teal-500/20">
          <Layers className="w-5 h-5 text-zinc-950 font-bold" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">RouteIQ</h1>
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-1 block">Geospatial VRP</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
                }`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-300">FastAPI Solver</span>
            <span className="text-[10px] text-zinc-500">Connected to {getOptimizerHost(OPTIMIZER_API_URL)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
