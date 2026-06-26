# Deployment Guide - OrderBot Admin Dashboard

This guide walks you through deploying the **OrderBot Admin Dashboard** database, backend, and frontend services.

## Prerequisites
- A GitHub repository containing this project
- A **Render** account (for backend and database hosting)
- A **Vercel** account (optional, for frontend hosting if not using Render)
- Node.js (v18+) installed locally

---

## 1. Database & Local Setup

### Local Installation
1. Clone the project and navigate to the project root.
2. Install dependencies:
   ```bash
   npm install
   npm run install:all
   ```
3. Create a `.env` file in the `backend/` folder (or copy from `.env.example` at root):
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:password@localhost:5432/orderbot_db"
   JWT_SECRET="your_jwt_secret_key"
   ```
4. Run Prisma Migrations & Seeds:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
5. Run the development environment:
   ```bash
   cd ..
   npm run dev
   ```

---

## 2. Deploying Backend & PostgreSQL Database on Render

Render provides database hosting and web services. You can deploy both using the provided [render.yaml](file:///c:/Users/Vaishnavi/OneDrive/Desktop/AHF%20Admin%20Dashboard/render.yaml) file or manually via the dashboard.

### Option A: Using Blueprint (Infrastructure as Code)
1. Go to your Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will parse [render.yaml](file:///c:/Users/Vaishnavi/OneDrive/Desktop/AHF%20Admin%20Dashboard/render.yaml) and automatically provision:
   - A PostgreSQL Database
   - An Express backend service
   - A static site service for the frontend
5. Wait for the services to build and deploy.

### Option B: Manual Deployment

#### Step 1: Create a PostgreSQL Database on Render
1. Go to Render, click **New** -> **PostgreSQL**.
2. Name it `orderbot-db` and click **Create Database**.
3. Copy the **Internal Database URL** (for backend communication) and the **External Database URL** (for local migrations).

#### Step 2: Create a Web Service for the Backend
1. Click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `orderbot-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install --prefix backend && npx prisma generate --schema=backend/prisma/schema.prisma`
   - **Start Command**: `npm start --prefix backend`
4. Add the following Environment Variables in the service settings:
   - `PORT`: `10000`
   - `DATABASE_URL`: *(Your Render PostgreSQL connection string)*
   - `JWT_SECRET`: *(A random secure string)*
5. Click **Deploy Web Service**.
6. When deployment finishes, copy the URL of your backend (e.g., `https://orderbot-backend.onrender.com`).

---

## 3. Deploying Frontend

You can deploy the React static frontend to **Vercel** or **Render Static Sites**.

### Option A: Deploying on Vercel
Vercel is the recommended option for hosting static React SPAs due to fast global CDN delivery.

1. Go to your Vercel Dashboard, click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (or keep root and specify build command)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://orderbot-backend.onrender.com/api` (use your actual Render backend URL)
5. Click **Deploy**. Vercel will build the frontend. The static file paths and router fallback rules are handled by the [vercel.json](file:///c:/Users/Vaishnavi/OneDrive/Desktop/AHF%20Admin%20Dashboard/vercel.json) file automatically.

### Option B: Deploying on Render (Static Site)
If you prefer keeping all services in Render:
1. Click **New** -> **Static Site**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `orderbot-frontend`
   - **Build Command**: `npm install --prefix frontend && npm run build --prefix frontend`
   - **Publish Directory**: `frontend/dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://orderbot-backend.onrender.com/api`
5. Click **Create Static Site**.
