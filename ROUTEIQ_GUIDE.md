# RouteIQ: System Overview & Operational Guide

RouteIQ is an end-to-end, intelligent Fleet Management and Geospatial Route Optimization application built for logistics and transportation operations, with specialized tuning for Nigerian road conditions (including Lagos traffic congestion, degraded road corridors, police/security checkpoints, and seasonal flood zones).

---

## 1. Overview: What RouteIQ Does

RouteIQ solves a primary challenge in fleet logistics: **delivering maximum payload with minimal vehicles, shortest transit time, and lowest fuel cost.**

### Core System Objectives
1. **Automated Delivery Route Optimization:** Processes multi-stop delivery locations and assigns them to fleet vehicles in the most cost-effective sequence.
2. **Nigerian Road Factor Modeling:** Integrates localized road dynamics:
   - **Degraded Corridors:** Applies a 1.8x travel-time penalty.
   - **Checkpoints & Tolls:** Adds +15 minutes (900 seconds) per checkpoint encounter.
   - **Active Flood Zones:** Applies a 3-hour detour penalty for routes intersecting flood polygons.
3. **Real-Time Fleet Tracking:** Monitors driver locations live via interactive maps using Supabase Realtime.
4. **Fuel Expense Tracking:** Tracks refuel volume (Liters), price per liter, and overall cost (NGN).
5. **Driver Mobile Portal:** Provides drivers with a simplified mobile checklist to view stop sequences, update trip statuses, and submit fuel receipts.

---

## 2. System Architecture & Core Modules

RouteIQ consists of 5 core operational modules:

```
                  +-----------------------------------------+
                  |        Lagos Operations Command         |
                  |                (Dashboard)              |
                  +--------------------+--------------------+
                                       |
      +----------------+---------------+---------------+----------------+
      |                |               |               |                |
      v                v               v               v                v
+-----------+    +-----------+   +-----------+   +-----------+    +-----------+
|  Fleet &  |    |   Route   |   | Live Map  |   |  Driver   |    | Fuel Logs |
| Vehicles  |    | Optimizer |   | Tracking  |   | Portal    |    | & Expenses|
+-----------+    +-----------+   +-----------+   +-----------+    +-----------+
```

### 1. Operations Command (Dashboard)
- **KPI Metrics:** Displays real-time counts of active vehicles, total load capacity (kg), total fuel expense (NGN), active trips, and completed routes.
- **Navigation:** Quick-action access to optimize new routes or inspect drivers.

### 2. Route Optimizer (`/optimizer`)
- **Multi-Stop Inputs:** Enter a central depot location and multiple delivery waypoints with load demands (kg).
- **Vehicle Capacities:** Select active fleet vehicles and specify payload limits.
- **Environmental & Institutional Overlays:** Toggle bad road zones, checkpoints, and flood polygons to adjust route calculations.
- **FastAPI + OR-Tools Solver:** Executes a Capacitated Vehicle Routing Problem (CVRP) algorithm to generate step-by-step dispatch plans.

### 3. Live Map Tracking (`/live-map`)
- **Real-Time GPS Ingestion:** Subscribes to database changes for real-time driver coordinate streams.
- **Driver Status Visualizer:** Monitors vehicle statuses (`active`, `idle`, `at_stop`, `off_duty`).
- **Route Line Tracing:** Displays planned vs. actual driver travel trajectories.

### 4. Fleet & Driver Management (`/fleet`)
- **Vehicle Inventory:** Register vehicle registration numbers, load capacity (kg), fuel types, and operational status.
- **Driver Roster:** Manage driver contact details, license numbers, vehicle assignments, and trip history.

### 5. Driver Mobile Portal (`/driver`)
- **Dispatch Checklist:** Mobile view presenting ordered delivery stops, recipient addresses, and package weights.
- **Status Updates:** One-touch state progression (`Start Trip` -> `Arrived at Stop` -> `Complete Delivery`).
- **Fuel Refill Logging:** Input form for drivers to record refuel amounts (Liters) and cost (NGN).

---

## 3. How Route Optimization Works Under the Hood

When an operator clicks **"Optimize Route"**, the system performs the following sequence:

```
[1. User Inputs Stops & Fleet Capacities]
                     |
                     v
[2. Cost Matrix Construction & Modifier Application]
  - Haversine base distance / speed
  - Degraded Corridor Intersection = 1.8x time multiplier
  - Checkpoint Proximity Buffer = +15 min delay per checkpoint
  - Flood Zone Polygon Intersection = +3 hr detour penalty
                     |
                     v
[3. OR-Tools CVRP Solver Engine]
  - Solves vehicle capacity & route sequence constraints
                     |
                     v
[4. Dispatch Generation & Realtime Sync]
  - Route visualizes on map & syncs to Driver Portal
```

1. **Distance & Time Matrix:** Computes straight-line Haversine distances between all pairs of coordinates.
2. **Road Modifier Engine:** Uses `Shapely` geometry intersections to detect if route segments cross degraded corridors, checkpoints, or flood zones, adjusting travel time matrices accordingly.
3. **Capacitated Vehicle Routing Problem (CVRP) Solver:** Google OR-Tools evaluates thousands of route combinations to find the sequence that minimizes total time and fuel while satisfying vehicle weight limits.
4. **Database & UI Dispatch:** The resulting trip manifest is stored in Supabase and pushed directly to the designated driver's mobile view.

---

## 4. Operational Workflow & User Guide

### Phase 1: Fleet & Driver Onboarding
1. Navigate to `/fleet`.
2. Register fleet vehicles with their maximum payload capacity (e.g., *Toyota HiAce - 1,500 kg*).
3. Create driver profiles and assign them to specific vehicles.

### Phase 2: Route Planning & Dispatching
1. Open `/optimizer`.
2. Define the **Depot Location** (e.g., *Ikeja Central Warehouse*).
3. Input **Delivery Waypoints** along with item weights in kg.
4. Select available vehicles and toggle applicable road condition overlays (e.g., active flood alerts or security checkpoints).
5. Click **"Run Optimizer"** to calculate the route.
6. Review calculated travel times, distances, and savings, then click **"Dispatch Trip"**.

### Phase 3: Driver Execution
1. The driver opens `/driver` on their mobile device.
2. Taps **"Start Trip"** to initiate GPS location streaming.
3. Follows the ordered waypoint list, tapping **"Mark Completed"** at each stop.
4. When refueling, opens **"Log Fuel"**, enters fuel liters and total NGN cost, and submits the log.

### Phase 4: Operations Oversight
1. Operations managers monitor `/live-map` for live GPS location updates and delivery progress.
2. Review fuel costs and operational performance on the main Dashboard (`/`).

---

## 5. Summary of System Benefits

| Operational Area | Standard Approach | RouteIQ Approach |
| :--- | :--- | :--- |
| **Route Planning** | Manual planning & unoptimized stop order | Algorithmic optimization in < 5 seconds |
| **Road Obstacles** | Unpredictable delays from bad roads/floods | Automated detour routing around spatial hazards |
| **Vehicle Payload** | Sub-optimal vehicle utilization | Exact payload matching via VRP constraint solver |
| **Fleet Visibility** | Frequent phone calls to drivers | Live real-time GPS map tracking |
| **Fuel Tracking** | Manual paper receipts & untracked spend | Digital driver fuel logging & expense analytics |
