# RouteIQ Production Deployment Guide

This guide details the step-by-step instructions for deploying RouteIQ, including the **Next.js Frontend (Vercel)**, the **Python FastAPI Optimizer (Render / Fly.io)**, and the **Supabase Database & Realtime**.

---

## 1. Database Setup (Supabase)

RouteIQ uses **Supabase** for user authentication, roles (managers and drivers), vehicle inventory, trip assignments, GPS tracking, and fuel logging.

### Step-by-Step Setup
1. **Create a Supabase Project:**
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Note your database password, **API URL**, and **Anon API Key**.

2. **Execute Database Schema Migration:**
   - In your Supabase project dashboard, navigate to the **SQL Editor**.
   - Create a **New Query**.
   - Open and copy the SQL code from [20260720000000_init_schema.sql](file:///c:/Users/CHRIS/OneDrive/Documents/New%20folder/backend/supabase/migrations/20260720000000_init_schema.sql) in your repository.
   - Paste the SQL into the editor and click **Run**. This will:
     - Enable the `postgis` spatial extension.
     - Create tables for `fleets`, `profiles`, `vehicles`, `drivers`, `trips`, `waypoints`, `gps_logs`, and `fuel_logs`.
     - Configure Row Level Security (RLS) policies for managers and drivers.
     - Enable Supabase Realtime replication on the `gps_logs` and `trips` tables.

3. **Check Credentials:**
   - Keep your Supabase API URL and Anon Key ready for the frontend deployment.

---

## 2. Solver Backend Deployment (FastAPI)

The RouteIQ solver backend runs a FastAPI application with high-performance routing libraries (`ortools`, `shapely`) to calculate optimized vehicle trajectories.

Because it runs Python and compiled C++ libraries, it cannot be hosted directly on Vercel. We recommend deploying to **Render** or **Fly.io**.

### Option A: Deploying on Render (Recommended)
1. Sign up/Log in to [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository (GitHub/GitLab).
4. Configure the following build settings:
   - **Name:** `routeiq-optimizer-api`
   - **Environment:** `Python`
   - **Root Directory:** `backend/routing`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.
6. Once deployed, copy your web service URL (e.g., `https://routeiq-optimizer-api.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

The Next.js frontend handles route mapping, driver check-ins, tracking, and manager operations.

### Step-by-Step Setup
1. Sign up/Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your Git repository containing the RouteIQ codebase.
4. **Configure Project Settings:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Edit and select `frontend`. (Vercel will build only the contents of the `frontend` folder).
5. **Environment Variables:**
   Add the following environment variables under **Environment Variables** in Vercel:
   
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Your Supabase project Anon API Key |
   | `NEXT_PUBLIC_OPTIMIZER_API_URL` | `https://your-render-app.onrender.com` | Deployed URL of your FastAPI backend |

6. Click **Deploy**. Vercel will build and publish your application.

---

## 4. Local Testing & Verification

To verify that your production settings align with the frontend codebase, you can run a production build locally:

```bash
cd frontend
npm run build
npm run start
```
This builds and starts the local server using production optimization patterns.
