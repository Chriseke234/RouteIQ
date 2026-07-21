'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG Icons
const createSvgIcon = (color: string, number?: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="${color}" stroke="#09090b" stroke-width="1.5"/>
          <circle cx="12" cy="9" r="4.5" fill="#ffffff"/>
        </svg>
        ${number ? `<span style="position: absolute; top: 4px; font-size: 9px; font-weight: bold; color: #000;">${number}</span>` : ''}
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const createCheckpointIcon = () => {
  return L.divIcon({
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <path d="M8 12H16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8V16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    className: 'custom-leaflet-icon-checkpoint',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface MapComponentProps {
  center?: [number, number]; // [lat, lon]
  zoom?: number;
  stops?: { id: string; name: string; latitude: number; longitude: number; demand: number }[];
  depot?: [number, number]; // [lat, lon]
  routes?: {
    vehicle_id: number;
    color: string;
    stops: { coordinates: [number, number]; name: string; demand: number }[];
  }[];
  degradedCorridors?: { id: string; coordinates: [number, number][] }[]; // polygon coords as [lat, lon]
  checkpoints?: { id: string; latitude: number; longitude: number }[];
  floodPolygons?: { id: string; coordinates: [number, number][] }[];
  
  clickMode?: 'stop' | 'checkpoint' | 'none';
  onMapClick?: (lat: number, lon: number) => void;
  
  liveDrivers?: { driver_id: string; driver_name: string; latitude: number; longitude: number; speed: number }[];
}

export default function MapComponent({
  center = [6.5244, 3.3792], // Default Lagos
  zoom = 12,
  stops = [],
  depot = [6.5244, 3.3792],
  routes = [],
  degradedCorridors = [],
  checkpoints = [],
  floodPolygons = [],
  clickMode = 'none',
  onMapClick,
  liveDrivers = [],
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Layer groups to easily clear and re-render dynamic items
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const driverLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet Map instance
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
    });

    // Dark-themed tile layer for premium look (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    // Create and add layer groups
    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    overlayLayerRef.current = L.layerGroup().addTo(map);
    driverLayerRef.current = L.layerGroup().addTo(map);

    // Bind map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map click handler dynamically if onMapClick changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.off('click');
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    });
  }, [onMapClick]);

  // Render Depot, Stops and Checkpoints
  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) return;

    markerLayer.clearLayers();

    // 1. Render Depot (Base location)
    if (depot) {
      L.marker(depot, { icon: createSvgIcon('#10b981') }) // Emerald green for depot
        .bindPopup('<b>Depot (Starting Point)</b>')
        .addTo(markerLayer);
    }

    // 2. Render Delivery Stops (Blue pins)
    stops.forEach((stop, idx) => {
      L.marker([stop.latitude, stop.longitude], { icon: createSvgIcon('#3b82f6', (idx + 1).toString()) })
        .bindPopup(`
          <div>
            <h4 class="font-bold text-zinc-900">${stop.name}</h4>
            <p class="text-xs text-zinc-600">Demand: ${stop.demand} kg</p>
            <p class="text-xs text-zinc-400">Lat: ${stop.latitude.toFixed(4)}, Lon: ${stop.longitude.toFixed(4)}</p>
          </div>
        `)
        .addTo(markerLayer);
    });

    // 3. Render Institutional Checkpoints (Red circular markers)
    checkpoints.forEach((cp) => {
      L.marker([cp.latitude, cp.longitude], { icon: createCheckpointIcon() })
        .bindPopup('<b>Military/Police Checkpoint</b><br/>Delay: +15 mins')
        .addTo(markerLayer);
    });
  }, [stops, depot, checkpoints]);

  // Render Overlays (Degraded corridors, Floods)
  useEffect(() => {
    const overlayLayer = overlayLayerRef.current;
    if (!overlayLayer) return;

    overlayLayer.clearLayers();

    // 1. Render Degraded Corridors (Orange polygons)
    degradedCorridors.forEach((poly) => {
      L.polygon(poly.coordinates, {
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.15,
        weight: 2,
      })
        .bindPopup('<b>Degraded Corridor</b><br/>Speed limit reduced (1.8x travel cost)')
        .addTo(overlayLayer);
    });

    // 2. Render Flood Polygons (Blue polygons)
    floodPolygons.forEach((poly) => {
      L.polygon(poly.coordinates, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '5, 5',
      })
        .bindPopup('<b>Active Flood Zone</b><br/>Severe traffic / Detour penalty (+3 hrs)')
        .addTo(overlayLayer);
    });
  }, [degradedCorridors, floodPolygons]);

  // Render Routes (Polylines)
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;

    routeLayer.clearLayers();

    routes.forEach((route) => {
      const pathPoints = route.stops.map(s => s.coordinates);
      
      // Draw route line
      L.polyline(pathPoints, {
        color: route.color,
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      })
        .bindPopup(`<b>Vehicle Route ${route.vehicle_id + 1}</b>`)
        .addTo(routeLayer);

      // Draw arrows or direction markers
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        
        // Simple midpoint indicator
        const midPoint: [number, number] = [
          (p1[0] + p2[0]) / 2,
          (p1[1] + p2[1]) / 2,
        ];
        
        L.circleMarker(midPoint, {
          radius: 3,
          color: route.color,
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 1,
        }).addTo(routeLayer);
      }
    });
  }, [routes]);

  // Render Live Driver Locations
  useEffect(() => {
    const driverLayer = driverLayerRef.current;
    if (!driverLayer) return;

    driverLayer.clearLayers();

    liveDrivers.forEach((driver) => {
      L.marker([driver.latitude, driver.longitude], {
        icon: L.divIcon({
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
              <div style="position: absolute; width: 32px; height: 32px; background-color: #f59e0b; opacity: 0.3; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
                <path d="M12 7V13M12 13H15" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
          `,
          className: 'custom-driver-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
      })
        .bindPopup(`
          <div>
            <h4 class="font-bold text-zinc-900">${driver.driver_name}</h4>
            <p class="text-xs text-zinc-600">Speed: ${driver.speed.toFixed(1)} km/h</p>
          </div>
        `)
        .addTo(driverLayer);
    });
  }, [liveDrivers]);

  // Style cursor according to selected interaction mode
  const getCursorClass = () => {
    if (clickMode === 'stop') return 'cursor-crosshair';
    if (clickMode === 'checkpoint') return 'cursor-crosshair';
    return 'cursor-grab active:cursor-grabbing';
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-inner">
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full ${getCursorClass()}`}
        style={{ minHeight: '400px' }} 
      />
      {clickMode !== 'none' && (
        <div className="absolute top-4 right-4 z-[1000] px-4 py-2 bg-zinc-950/90 text-white rounded-xl border border-zinc-800 shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Click map to add a {clickMode}</span>
        </div>
      )}
    </div>
  );
}
