# 🚚 Order Routing Engine — AI-Powered Warehouse Selection

A full-stack logistics decision platform inspired by Amazon, Flipkart, and Blinkit. Place a customer order and the system **instantly selects the optimal warehouse** based on distance, inventory health, delivery speed, and cost — then generates an **AI-powered business explanation** of why that warehouse was chosen.

---

## 📑 Table of Contents

- [Overview](#-overview)
- ## Application Interface
- <img width="638" height="277" alt="image" src="https://github.com/user-attachments/assets/ab3ec579-1485-42b1-9b4b-d39633b1b523" />

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Seeding](#-database-seeding)
- [Running the Application](#-running-the-application)
- [How the Routing Engine Works](#-how-the-routing-engine-works)
- [Weighted Scoring Formula](#-weighted-scoring-formula)
- [Per-Warehouse Logistics Attributes](#-per-warehouse-logistics-attributes)
- [Authentication & Authorization](#-authentication--authorization)
- [User Roles & Permissions](#-user-roles--permissions)
- [API Reference](#-api-reference)
- [Database Models (Schemas)](#-database-models-schemas)
- [Frontend Architecture](#-frontend-architecture)
- [Frontend Pages](#-frontend-pages)
- [Auto-Order Generation (Cron)](#-auto-order-generation-cron)
- [Deploying to Render](#-deploying-to-render)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🔭 Overview

The **Order Routing Engine** is a full-stack web application that simulates a real-world order fulfillment pipeline. When a customer order is placed, the system:

1. **Filters** warehouses — eliminates inactive warehouses and those with insufficient inventory.
2. **Scores** remaining warehouses on four weighted factors (distance, inventory health, delivery speed, and cost) using **Min-Max normalization** so scores are always fair and relative across all candidates — no single metric dominates due to scale differences.
3. **Selects** the warehouse with the highest composite score.
4. **Reserves** inventory at the selected warehouse in real time (decrement available, increment reserved).
5. **Generates** a natural-language AI explanation (via Groq / Llama 3.1 8B Instant) of the routing decision in plain business English. Scores are never shown to the user.
6. **Persists** the full decision audit (all scores, eliminated warehouses, weights snapshot, AI explanation) to `RoutingHistory` for future review.

Each warehouse now carries its own **logistics profile** — a dispatch time (hours to start shipping), a cost rate (₹ per km), and a shipment speed (km per day) — making the routing decisions realistic and warehouse-specific rather than relying on global constants.

The platform also includes an interactive **Leaflet map** that draws a dashed polyline from the customer to the winning warehouse, a role-based **admin/manager dashboard**, and a configurable **routing weights panel** with live sliders.

---

## ✨ Key Features

| Category | Feature |
|---|---|
| **Two-Pass Routing** | Raw scores are first computed per warehouse, then scaled to [0,1] using Min-Max normalization so every factor is fairly weighted regardless of magnitude. |
| **Per-Warehouse Logistics** | Each warehouse has its own `dispatchTime` (hours), `costPerKm` (₹/km), and `shipmentSpeed` (km/day). Delivery and cost scores are computed from real warehouse data, not hardcoded constants. |
| **AI Explanations** | Groq SDK + Llama 3.1 8B Instant generates a concise 3-sentence, business-friendly explanation for every routing decision. Scores are explicitly hidden from the user in the prompt. |
| **Interactive Mapping** | Leaflet / React-Leaflet draws a dashed purple polyline from the customer (red pin) to the winning warehouse (green pin) with color-coded markers. |
| **Real-Time Inventory** | Inventory is reserved the exact moment an order is routed — `availableQuantity` decremented, `reservedQuantity` incremented. No double-allocations possible. |
| **Role-Based Access** | JWT-authenticated users with `admin` and `manager` roles see different sidebar items and different API permissions are enforced on the backend. |
| **Configurable Weights** | Admin can tune the four scoring weights (distance, inventory, delivery, cost) via live sliders — weights must always sum to exactly 100. |
| **Auto-Order Cron** | Optional `node-cron` job generates and routes a random order every 30 seconds to simulate live traffic. |
| **Random Order Generator** | One-click button generates and routes a random order with a random Indian customer name, coordinates, product, and quantity (1–5). |
| **Full Audit History** | Every routing decision — all candidate scores, eliminated warehouses, config weights snapshot, AI explanation — is stored and browsable in the Routing History UI. |
| **Premium Dark UI** | Material UI v9 dark theme with glassmorphism cards, backdrop blur, vibrant purple/cyan accents on a near-black background (`#0a0a0f`). |

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 19.x | SPA framework |
| **Build Tool** | Vite | 8.x | Dev server and production bundler |
| **UI Library** | Material UI (MUI) | 9.x | Dark-themed component library |
| **Icons** | Lucide React | 1.18.x | Sidebar and dashboard icons |
| **Routing** | React Router DOM | 7.x | Client-side page routing |
| **HTTP Client** | Axios | 1.18.x | API communication with request/response interceptors |
| **Map** | Leaflet + React-Leaflet | 1.9.x / 5.x | Interactive map with markers and polylines |
| **Backend** | Node.js + Express | 5.x | REST API server |
| **Database** | MongoDB Atlas + Mongoose | 9.x | Document storage and ODM |
| **Authentication** | JWT + bcryptjs | 9.x / 3.x | Token-based auth with password hashing |
| **AI** | Groq SDK (Llama 3.1 8B Instant) | 1.2.x | Natural-language routing explanations |
| **Scheduling** | node-cron | 4.x | Optional auto-order generation |
| **Testing** | mongodb-memory-server | 11.x | In-memory MongoDB for integration tests |

---

## 📂 Project Structure

```
order-routing-engine/
│
├── README.md                       # This file
├── .gitignore                      # Excludes node_modules, .env, dist/
│
├── client/                         # ────── React Frontend (Vite) ──────
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── eslint.config.js            # ESLint configuration
│   ├── public/                     # Static assets (favicon, etc.)
│   └── src/
│       ├── main.jsx                # React DOM render entry
│       ├── App.jsx                 # Root component with all client-side routes
│       ├── App.css                 # Global styles
│       ├── index.css               # CSS reset / base
│       ├── theme.js                # MUI dark theme configuration
│       ├── api/
│       │   └── axios.js            # Axios instance with auth interceptors
│       ├── context/
│       │   └── AuthContext.jsx     # React Context for auth state (persisted in localStorage)
│       ├── components/
│       │   ├── Layout.jsx          # Persistent sidebar (240px) + main content layout
│       │   └── ProtectedRoute.jsx  # Route guard (auth check + optional role check)
│       └── pages/
│           ├── Login.jsx                # Login page (username + password + role)
│           ├── Register.jsx             # User registration page
│           ├── Dashboard.jsx            # Admin dashboard (4 stat cards)
│           ├── WarehouseManagement.jsx  # CRUD for warehouses + logistics attributes
│           ├── InventoryManagement.jsx  # View/update inventory with low-stock badges
│           ├── OrderManagement.jsx      # Order list + route order form + random generator
│           ├── RoutingDecision.jsx      # Decision details + Leaflet map + full scores table
│           ├── RoutingHistory.jsx       # Historical routing log (all past decisions)
│           ├── WarehouseMap.jsx         # Full-page Leaflet map of all warehouses
│           └── RoutingSettings.jsx      # Configure routing weights with live sliders
│
└── server/                         # ────── Node.js Backend (Express) ──────
    ├── package.json                # Backend dependencies + start script
    ├── server.js                   # Express app entry point + MongoDB connection + cron
    ├── seed.js                     # Database seeding script (clears + repopulates)
    ├── test_routes.js              # Integration test script (uses in-memory MongoDB)
    ├── controllers/
    │   ├── authController.js       # Register & login logic
    │   ├── configController.js     # Get/update routing config (weights)
    │   ├── inventoryController.js  # CRUD inventory
    │   ├── orderController.js      # CRUD orders + random order generation endpoint
    │   ├── productController.js    # CRUD products
    │   ├── routingController.js    # Route order + fetch routing history endpoints
    │   └── warehouseController.js  # CRUD warehouses
    ├── middleware/
    │   └── authMiddleware.js       # JWT verification (verifyToken) + role guard (requireRole)
    ├── models/
    │   ├── Inventory.js            # Inventory schema (warehouseId, productId, qty)
    │   ├── Order.js                # Order schema (customer, product, status, warehouse)
    │   ├── Product.js              # Product schema (name, category, SKU)
    │   ├── RoutingConfig.js        # Singleton routing weights document
    │   ├── RoutingHistory.js       # Decision audit log (all scores, weights, AI text)
    │   ├── User.js                 # User schema with bcrypt pre-save hook
    │   └── Warehouse.js            # Warehouse schema including logistics attributes
    ├── routes/
    │   ├── authRoutes.js           # POST /register, /login
    │   ├── configRoutes.js         # GET/PUT /config
    │   ├── inventoryRoutes.js      # POST/GET/PUT /inventory
    │   ├── orderRoutes.js          # POST/GET/PUT /orders, POST /generate-random
    │   ├── productRoutes.js        # POST/GET /products
    │   ├── routingRoutes.js        # POST /route-order, GET /routing-history
    │   └── warehouseRoutes.js      # POST/GET/PUT /warehouses
    └── services/
        ├── routingEngine.js        # Core algorithm: Haversine + Min-Max + weighted scoring
        ├── aiExplanation.js        # Groq/Llama 3.1 prompt builder + API call
        ├── orderService.js         # End-to-end order processing pipeline
        └── orderGenerator.js       # Random order generator for cron and manual trigger
```

---

## 📋 Prerequisites

Before running the project, make sure you have:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | >= 18.x | Required for both client and server |
| **npm** | >= 9.x | Comes bundled with Node.js |
| **MongoDB Atlas** | — | Free tier (M0) works perfectly. You need a connection URI. |
| **Groq API Key** | — | Free at [console.groq.com](https://console.groq.com). Used for AI explanations. Optional — the app works gracefully without it. |
| **Git** | Any | To clone the repository |

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/order-routing-engine.git
cd order-routing-engine
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `server/` directory (see the [Environment Variables](#-environment-variables) section below for all keys).

### 5. Seed the Database

```bash
cd server
node seed.js
```

> This populates MongoDB with 2 users, 5 warehouses (each with unique logistics attributes), 3 products, 15 inventory records, and the default routing config.

### 6. Start the Backend

```bash
cd server
node server.js
```

> The server starts on `http://localhost:5000` by default.

### 7. Start the Frontend

Open a **new terminal**:

```bash
cd client
npm run dev
```

> The Vite dev server starts on `http://localhost:5173` by default.

---

## 🔑 Environment Variables

Create a `.env` file in the **`server/`** directory with the following keys:

```env
# Server port (defaults to 5000 if not set; use 10000 when deploying to Render)
PORT=5000

# MongoDB Atlas connection string (include tls flags for Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/order_routing?tls=true&tlsAllowInvalidCertificates=true

# Groq API key for AI explanations (optional — skipped gracefully if missing)
GROQ_API_KEY=gsk_your_groq_api_key_here

# JWT secret for signing tokens (use a long random string in production)
JWT_SECRET=your_long_random_jwt_secret_here

# Set to 'true' to enable the auto-order cron job (optional, default: false)
ENABLE_AUTO_ORDERS=false
```

> **Note on TLS**: The server connects to MongoDB Atlas with `tls: true` and `tlsAllowInvalidCertificates: true` in the Mongoose connection options. If you are connecting to a local MongoDB instance without TLS, you can remove those flags from `server.js`.

The frontend uses a Vite environment variable for the API base URL. It defaults to `http://localhost:5000/api`. To override it, create a `.env` in the **`client/`** directory:

```env
VITE_API_URL=http://localhost:5000/api
```

When deploying the frontend, set this to your live Render backend URL:

```env
VITE_API_URL=https://your-app-name.onrender.com/api
```

---

## 🌱 Database Seeding

The `seed.js` script wipes and repopulates the database with sample data for immediate testing:

```bash
cd server
node seed.js
```

### What Gets Seeded

| Collection | Count | Data |
|---|---|---|
| **Users** | 2 | `admin` / `admin123` (admin role), `manager` / `manager123` (manager role) |
| **Routing Config** | 1 | Default weights: Distance 35%, Inventory 35%, Delivery 20%, Cost 10% |
| **Warehouses** | 5 | Five major Indian city warehouses with unique logistics attributes |
| **Products** | 3 | Laptop (ELEC-LAP-001), Smartphone (ELEC-PHO-002), Headphones (ELEC-HDP-003) |
| **Inventory** | 15 | One entry per warehouse × product. Quantities range 5–50. Some set low (2, 5, 8) to trigger low-stock badges. |

### Seeded Warehouse Logistics Attributes

Each warehouse has a unique logistics profile that directly affects routing scores:

| Warehouse | City | Dispatch Time | Cost/km | Shipment Speed |
|---|---|---|---|---|
| Mumbai Central Hub | Mumbai | 12h ⚡ fastest | ₹5/km 💰 cheapest | 220 km/day 🚀 fastest |
| Delhi NCR Depot | Delhi | 24h | ₹7/km | 200 km/day |
| Bangalore Tech Park Storage | Bangalore | 36h | ₹6/km | 180 km/day |
| Chennai Coastal Warehouse | Chennai | 48h 🐢 slowest | ₹9/km 💸 costliest | 160 km/day 🐢 slowest |
| Hyderabad Logistics Center | Hyderabad | 18h | ₹8/km | 190 km/day |

> ⚠️ **Warning**: Running `seed.js` **deletes all existing data** in the following collections before inserting fresh seed data: Warehouses, Products, Inventory, Orders, RoutingHistory, Users, RoutingConfig.

---

## ▶️ Running the Application

### Development Mode (Recommended)

**Terminal 1 — Backend:**

```bash
cd server
node server.js
```

**Terminal 2 — Frontend:**

```bash
cd client
npm run dev
```

Open your browser at: **`http://localhost:5173`**

Log in with the seeded credentials:
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`

### Production Build (Frontend Only)

```bash
cd client
npm run build     # Outputs to client/dist/
npm run preview   # Serve the production build locally
```

---

## ⚙️ How the Routing Engine Works

When an order is submitted, it flows through an 11-step pipeline defined in `server/services/routingEngine.js` and orchestrated by `server/services/orderService.js`:

```
1.  Order Placed (customerLat, customerLng, productId, quantity, customerName)
         ↓
2.  Query Inventory — find all inventory records for the product, populate warehouseId
         ↓
3.  Filter: Remove warehouses where activeStatus !== true  →  record as "Inactive"
         ↓
4.  Filter: Remove warehouses where availableQty < quantity  →  record as "Insufficient stock"
         ↓
5.  Pass 1 — For each eligible warehouse, compute 4 raw factor scores
         ↓
6.  Track min/max of each raw score across ALL candidates
         ↓
7.  Pass 2 — Apply Min-Max Normalization to scale each score to [0, 1]
         ↓
8.  Compute weighted finalScore per warehouse
         ↓
9.  Select the warehouse with the highest finalScore
         ↓
10. Reserve Inventory (availableQty--, reservedQty++)
         ↓
11. Generate AI Explanation (Groq / Llama 3.1 8B Instant)
         ↓
12. Persist Order (status: "assigned") + RoutingHistory to MongoDB
```

### Step-by-Step Breakdown

| Step | Description | Code Location |
|---|---|---|
| **1. Receive Order** | API receives `customerLat`, `customerLng`, `productId`, `quantity`, `customerName`. | `routingController.js` → `orderService.js` |
| **2. Query Inventory** | Find all inventory entries for the requested product with `warehouseId` populated. | `orderService.js` line 14 |
| **3. Filter Inactive** | Warehouses with `activeStatus !== true` are immediately eliminated. Their names are recorded with reason `"Inactive"`. | `routingEngine.js` lines 39–53 |
| **4. Filter Insufficient Stock** | Warehouses with `availableQuantity < quantity` are eliminated. Reason: `"Insufficient stock"`. | `routingEngine.js` lines 39–53 |
| **5. Raw Score Computation** | For each eligible warehouse, 4 raw factor values are computed using the warehouse's own logistics attributes. | `routingEngine.js` lines 77–117 |
| **6. Min/Max Tracking** | As raw scores are computed, global `min` and `max` per factor are tracked across all candidates. | `routingEngine.js` lines 102–110 |
| **7. Min-Max Normalization** | Each raw score is scaled to [0, 1]: `(raw - min) / (max - min)`. If all candidates tie, everyone gets `1`. | `routingEngine.js` lines 126–130 |
| **8. Weighted Score** | Normalized scores are combined with the configured weights from `RoutingConfig`. | `routingEngine.js` line 133 |
| **9. Winner Selection** | The warehouse with the highest `finalScore` is selected. | `routingEngine.js` lines 155–159 |
| **10. Reserve Inventory** | `selectedInventory.availableQuantity -= quantity`, `selectedInventory.reservedQuantity += quantity`, then saved to DB. | `orderService.js` lines 34–37 |
| **11. AI Explanation** | A detailed prompt (with all scores, metrics, rejected warehouses, and the configured weights) is sent to Groq. Returns a 3-sentence plain-English business reason. Scores are explicitly hidden from the response. | `aiExplanation.js` |
| **12. Persist** | Creates an `Order` document (status: `assigned`) and a `RoutingHistory` document containing all scores, eliminated warehouses, weights snapshot, and AI text. | `orderService.js` lines 39–81 |

---

## 🧮 Weighted Scoring Formula

The routing algorithm runs in **two passes** to ensure fair comparison across all eligible warehouses.

### Pass 1 — Raw Score Computation

For every eligible warehouse, four independent raw values are calculated:

| Factor | Raw Formula | What It Measures |
|---|---|---|
| **Distance** | `1 / (1 + distance_km)` | Inverse Haversine great-circle distance in km. Closer = higher raw value. Always between 0 and 1. |
| **Inventory Health** | `availableQty / (availableQty + reservedQty)` | Fraction of total stock that is still available. A warehouse with mostly-unreserved stock scores higher. |
| **Delivery Speed** | `1 / delivery_days` | `delivery_days = (distance_km / warehouse.shipmentSpeed) + (warehouse.dispatchTime / 24)`. Combines real transit time (distance ÷ speed) with per-warehouse dispatch overhead (hours ÷ 24). Fewer total days = higher raw value. |
| **Cost Efficiency** | `1 / (1 + cost)` | `cost = distance_km × warehouse.costPerKm`. Each warehouse has its own ₹/km rate. Lower total shipping cost = higher raw value. |

### Pass 2 — Min-Max Normalization

After all raw scores are computed, each factor is scaled relative to the field of candidates:

```
normalizedScore = (rawScore - minRaw) / (maxRaw - minRaw)
```

**Key properties:**
- The **best** warehouse on any factor always receives a normalized score of **1.0**
- The **worst** warehouse on any factor always receives a normalized score of **0.0**
- If all candidates produce **identical raw scores** for a factor (e.g., same distance), every warehouse receives **1.0** — no one is penalized for a tie

This ensures that a 1 km distance advantage doesn't inflate the distance score disproportionately relative to a 10% inventory difference.

### Final Composite Score

```
finalScore = (wDist × distScore) + (wInv × invScore) + (wDel × delScore) + (wCost × costScore)
```

Where the weights come from the `RoutingConfig` singleton:

| Factor | Default Weight |
|---|---|
| Distance | **35%** |
| Inventory Health | **35%** |
| Delivery Speed | **20%** |
| Shipping Cost | **10%** |

> **Weights are configurable** via the Routing Settings page (admin only). They are stored as a singleton document in the `RoutingConfig` collection and fetched fresh on every routing call. They must always sum to exactly 100.

---

## 🏭 Per-Warehouse Logistics Attributes

This is the key upgrade over a naive routing engine. Instead of using global constants for delivery and cost, every warehouse carries its own logistics profile stored in the `Warehouse` MongoDB document.

### Three New Fields on Every Warehouse

| Field | Unit | Default | Meaning |
|---|---|---|---|
| `dispatchTime` | Hours | 24 | How long it takes this warehouse to process and begin shipping an order after it is assigned. A warehouse with a 12h dispatch time ships 1 full day faster than one with a 36h dispatch time for the same distance. |
| `costPerKm` | ₹ per km | 5 | The per-kilometre shipping rate for this warehouse's carrier. A warehouse 500 km away charging ₹5/km costs ₹2,500. The same distance from a warehouse charging ₹9/km costs ₹4,500 — nearly twice as expensive. |
| `shipmentSpeed` | km per day | 200 | How fast the warehouse's delivery network covers distance. A package from a 220 km/day warehouse covers 440 km in 2 days. From a 160 km/day warehouse, the same 440 km takes 2.75 days. |

### How Delivery Days Are Calculated

```
transitDays   = distance_km / warehouse.shipmentSpeed
dispatchDays  = warehouse.dispatchTime / 24
delivery_days = transitDays + dispatchDays
```

**Example:** Customer in Pune (560 km from Delhi, 160 km from Mumbai)

| Warehouse | Distance | dispatchTime | shipmentSpeed | Transit Days | Dispatch Days | **Total Delivery Days** |
|---|---|---|---|---|---|---|
| Mumbai Central Hub | 160 km | 12h | 220 km/d | 0.73 days | 0.5 days | **1.23 days** |
| Delhi NCR Depot | 560 km | 24h | 200 km/d | 2.80 days | 1.0 day | **3.80 days** |

Mumbai delivers 3× faster — this significantly boosts its delivery score.

### How Shipping Cost Is Calculated

```
cost = distance_km × warehouse.costPerKm
```

**Example:** 400 km from two different warehouses

| Warehouse | Distance | costPerKm | **Total Cost** |
|---|---|---|---|
| Mumbai Central Hub | 400 km | ₹5/km | **₹2,000** |
| Chennai Coastal Warehouse | 400 km | ₹9/km | **₹3,600** |

Chennai costs 80% more for the same distance — this significantly lowers its cost score.

### Backward Compatibility

All three fields have sensible defaults in the Mongoose schema (`dispatchTime: 24`, `costPerKm: 5`, `shipmentSpeed: 200`). Any existing warehouse documents in the database that lack these fields will automatically fall back to the defaults via the `??` nullish coalescing operator in `routingEngine.js`.

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Registration** — `POST /api/auth/register` creates a user. The password is hashed via a Mongoose `pre('save')` hook using `bcryptjs` with 10 salt rounds. Plain text is never stored.
2. **Login** — `POST /api/auth/login` validates credentials and returns a signed JWT with an **8-hour expiry**.
3. **Token Attachment** — The frontend Axios **request interceptor** reads `auth_user` from `localStorage` and attaches the token as `Authorization: Bearer <token>` on every outgoing request.
4. **Token Verification** — The backend `verifyToken` middleware decodes the JWT and injects `req.user` (containing `id`, `username`, `role`) for use by downstream controllers.
5. **Auto-Logout** — The Axios **response interceptor** catches `401` and `403` errors, clears `localStorage`, and hard-redirects to `/login`.

### Middleware

| Middleware | Signature | Behavior |
|---|---|---|
| `verifyToken` | `(req, res, next)` | Reads `Authorization` header, decodes and verifies JWT. Returns `401 Unauthorized` on missing, expired, or tampered tokens. Injects `req.user`. |
| `requireRole` | `(...roles) => (req, res, next)` | Checks `req.user.role` against the provided allowed roles array. Returns `403 Forbidden` if the role is not in the list. Always used after `verifyToken`. |

---

## 👥 User Roles & Permissions

| Feature / Page | Admin | Manager |
|---|---|---|
| **Dashboard** (stat cards: warehouses, products, orders) | ✅ | ❌ |
| **Warehouse Management** (add, edit, set logistics attributes) | ✅ | ❌ |
| **Inventory Management** (view/update stock levels) | ✅ | ✅ |
| **Order Management** (view orders, mark fulfilled) | ✅ | ✅ |
| **Route an Order** (submit to routing engine) | ✅ | ❌ |
| **Generate Random Order** (one-click random route) | ✅ | ❌ |
| **Routing Decision** (view full decision + map + scores table) | ✅ | ✅ |
| **Routing History** (browse past routing decisions) | ✅ | ✅ |
| **Warehouse Map** (full-page Leaflet map of warehouses) | ✅ | ✅ |
| **Routing Settings** (configure scoring weights) | ✅ | ❌ |
| **Create Products** | ✅ | ❌ |

### Default Credentials (from Seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Most require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | — | Register a new user |
| `POST` | `/api/auth/login` | ❌ | — | Login and receive a JWT token |

#### `POST /api/auth/register`

```json
// Request Body
{
  "username": "newuser",
  "password": "securepassword",
  "role": "admin"
}

// Response (201 Created)
{
  "success": true,
  "data": { "username": "newuser", "role": "admin" },
  "message": "User registered successfully"
}
```

#### `POST /api/auth/login`

```json
// Request Body
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}

// Response (200 OK)
{
  "success": true,
  "data": { "token": "eyJhbGciOi...", "username": "admin", "role": "admin" },
  "message": "Logged in successfully"
}
```

---

### Warehouses

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/warehouses` | ✅ | Admin | Create a new warehouse |
| `GET` | `/api/warehouses` | ✅ | Any | List all warehouses |
| `GET` | `/api/warehouses/:id` | ✅ | Any | Get a warehouse by ID |
| `PUT` | `/api/warehouses/:id` | ✅ | Admin | Update a warehouse (including logistics attributes) |

#### `POST /api/warehouses` — with Logistics Attributes

```json
{
  "warehouseName": "Kolkata Eastern Hub",
  "city": "Kolkata",
  "latitude": 22.5726,
  "longitude": 88.3639,
  "capacity": 7000,
  "activeStatus": true,
  "dispatchTime": 20,
  "costPerKm": 6,
  "shipmentSpeed": 210
}
```

---

### Products

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/products` | ✅ | Admin | Create a new product |
| `GET` | `/api/products` | ✅ | Any | List all products |

#### `POST /api/products`

```json
{
  "productName": "Tablet",
  "category": "Electronics",
  "sku": "ELEC-TAB-004"
}
```

---

### Inventory

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/inventory` | ✅ | Admin | Create an inventory record |
| `GET` | `/api/inventory` | ✅ | Any | List all inventory (populated with warehouse & product names) |
| `PUT` | `/api/inventory/:id` | ✅ | Admin, Manager | Update inventory quantities |

#### `PUT /api/inventory/:id`

```json
{
  "availableQuantity": 100,
  "reservedQuantity": 5
}
```

---

### Orders

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/orders` | ✅ | Admin | Create a manual order (without routing) |
| `POST` | `/api/orders/generate-random` | ✅ | Admin | Generate a random order and route it |
| `GET` | `/api/orders` | ✅ | Any | List all orders (populated) |
| `GET` | `/api/orders/:id` | ✅ | Any | Get a specific order by ID |
| `PUT` | `/api/orders/:id` | ✅ | Admin, Manager | Update an order (e.g., mark as `fulfilled`) |

---

### Routing

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/routing/route-order` | ✅ | Admin | Run the full routing engine for an order |
| `GET` | `/api/routing/routing-history` | ✅ | Any | Get all routing history (newest first) |
| `GET` | `/api/routing/routing-history/:orderId` | ✅ | Any | Get routing history for a specific order |

#### `POST /api/routing/route-order`

```json
// Request Body
{
  "customerLat": 18.5204,
  "customerLng": 73.8567,
  "productId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "quantity": 2,
  "customerName": "Rahul Sharma"
}

// Response (200 OK)
{
  "success": true,
  "message": "Order routed successfully",
  "data": {
    "order": { },
    "selectedWarehouse": { },
    "routingScore": 0.8542,
    "routingReason": "Mumbai Central Hub was selected because it offers the fastest dispatch time and lowest shipping rate relative to the other candidates, resulting in the best balance of delivery speed and cost efficiency given the configured weights.",
    "allScores": [
      {
        "warehouseName": "Mumbai Central Hub",
        "distance_km": 160.3,
        "delivery_days": 1.23,
        "dispatchTime": 12,
        "shipmentSpeed": 220,
        "cost": 801.5,
        "costPerKm": 5,
        "distScore": 1.0,
        "invScore": 0.875,
        "delScore": 1.0,
        "costScore": 1.0,
        "distWeighted": 0.35,
        "invWeighted": 0.3063,
        "delWeighted": 0.2,
        "costWeighted": 0.1,
        "finalScore": 0.9563,
        "inventory": 42
      }
    ],
    "eliminatedWarehouses": [
      {
        "warehouseName": "Chennai Coastal Warehouse",
        "availableQuantity": 1,
        "reason": "Insufficient stock"
      }
    ],
    "weights": {
      "distanceWeight": 35,
      "inventoryWeight": 35,
      "deliveryWeight": 20,
      "costWeight": 10
    }
  }
}
```

---

### Routing Configuration

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/config` | ✅ | Any | Get current routing weights |
| `PUT` | `/api/config` | ✅ | Admin | Update routing weights (must sum to exactly 100) |

#### `PUT /api/config`

```json
// Request Body
{
  "distanceWeight": 40,
  "inventoryWeight": 30,
  "deliveryWeight": 20,
  "costWeight": 10
}
// All four weights must sum to exactly 100
```

---

## 🗄️ Database Models (Schemas)

### User

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | String | ✅ | Unique across all users |
| `password` | String | ✅ | Auto-hashed via bcrypt pre-save hook (10 salt rounds). Never stored as plain text. |
| `role` | String (enum) | ✅ | `"admin"` or `"manager"` |
| `createdAt` | Date | — | Defaults to `Date.now` |

### Warehouse

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `warehouseName` | String | ✅ | — | e.g., `"Mumbai Central Hub"` |
| `city` | String | ✅ | — | e.g., `"Mumbai"` |
| `latitude` | Number | ✅ | — | GPS latitude |
| `longitude` | Number | ✅ | — | GPS longitude |
| `capacity` | Number | ✅ | — | Max storage capacity |
| `activeStatus` | Boolean | — | `true` | Inactive warehouses are excluded from routing at the filter stage. |
| `dispatchTime` | Number | — | `24` | Hours before this warehouse begins shipping after an order is assigned. Used in delivery days formula. |
| `costPerKm` | Number | — | `5` | Warehouse-specific shipping rate in ₹ per km. Used in cost formula. |
| `shipmentSpeed` | Number | — | `200` | Speed of the warehouse's delivery network in km per day. Used in transit days formula. |
| `createdAt` | Date | — | `Date.now` | — |

### Product

| Field | Type | Required | Notes |
|---|---|---|---|
| `productName` | String | ✅ | e.g., `"Laptop"` |
| `category` | String | ✅ | e.g., `"Electronics"` |
| `sku` | String | ✅ | Unique SKU identifier (e.g., `"ELEC-LAP-001"`) |
| `createdAt` | Date | — | Defaults to `Date.now` |

### Inventory

| Field | Type | Required | Notes |
|---|---|---|---|
| `warehouseId` | ObjectId → Warehouse | ✅ | Reference to the Warehouse. Populated on all inventory queries. |
| `productId` | ObjectId → Product | ✅ | Reference to the Product. |
| `availableQuantity` | Number | ✅ | Available stock. Decremented atomically when an order is routed. |
| `reservedQuantity` | Number | ✅ | Reserved stock. Incremented atomically when an order is routed. |
| `updatedAt` | Date | — | Defaults to `Date.now` |

### Order

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerName` | String | ✅ | e.g., `"Rahul Sharma"` |
| `customerLatitude` | Number | ✅ | Customer GPS latitude. Used as the origin for Haversine distance calculation. |
| `customerLongitude` | Number | ✅ | Customer GPS longitude. |
| `productId` | ObjectId → Product | ✅ | Reference to the Product ordered. |
| `quantity` | Number | ✅ | Order quantity. Used as the minimum stock threshold during warehouse filtering. |
| `assignedWarehouseId` | ObjectId → Warehouse | — | Set by the routing engine on successful routing. Null for unrouted/pending orders. |
| `status` | String (enum) | — | `"pending"`, `"assigned"`, or `"fulfilled"`. Defaults to `"pending"`. Set to `"assigned"` immediately after routing. |
| `createdAt` | Date | — | Defaults to `Date.now` |

### RoutingConfig (Singleton)

There is always exactly one `RoutingConfig` document in the database. The routing engine fetches it fresh on every call, so weight changes take effect immediately for the next order.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `distanceWeight` | Number | ✅ | `35` | Weight for the distance factor (%) |
| `inventoryWeight` | Number | ✅ | `35` | Weight for the inventory health factor (%) |
| `deliveryWeight` | Number | ✅ | `20` | Weight for the delivery speed factor (%) |
| `costWeight` | Number | ✅ | `10` | Weight for the cost efficiency factor (%) |
| `updatedBy` | ObjectId → User | — | — | The admin user who last changed the config |
| `updatedAt` | Date | — | `Date.now` | — |

### RoutingHistory

One document is created per routed order, capturing the complete decision state at that moment in time.

| Field | Type | Required | Notes |
|---|---|---|---|
| `orderId` | ObjectId → Order | ✅ | The order this routing decision belongs to |
| `warehouseId` | ObjectId → Warehouse | — | The winning warehouse |
| `routingScore` | Number | — | Final composite score of the winner |
| `routingReason` | String | — | AI-generated business explanation (up to 3 sentences) |
| `allScores` | Array (Mixed) | — | Full scoring breakdown for every candidate warehouse — raw scores, normalized scores, weighted scores, delivery days, cost, dispatch time, shipment speed |
| `eliminatedWarehouses` | Array (Mixed) | — | Warehouses excluded from scoring with their reason (`"Inactive"` or `"Insufficient stock"`) |
| `weights` | Mixed | — | **Snapshot** of the four routing weights used for this specific decision. Stored so historical decisions are auditable even if weights are changed later. |
| `createdAt` | Date | — | Defaults to `Date.now` |

---

## 🎨 Frontend Architecture

### Theme

The application uses a **custom MUI dark theme** defined in `client/src/theme.js`:

- **Background**: Near-black (`#0a0a0f`) with translucent paper surfaces (`rgba(255,255,255,0.05)`)
- **Primary**: Vibrant purple (`#7c3aed`)
- **Secondary**: Cyan (`#06b6d4`)
- **Cards**: Glassmorphism — `background: rgba(255,255,255,0.03)`, `backdropFilter: blur(10px)`, semi-transparent borders
- **Modals**: Solid opaque dark (`#13131f`) with a blurred backdrop (`blur(4px)`) — overrides translucent paper to prevent content bleed-through
- **Typography**: Inter font family
- **Buttons**: Rounded corners (`borderRadius: 8`), no text transform

### State Management

- **AuthContext** (`client/src/context/AuthContext.jsx`) — React Context manages authentication state (`user`, `login()`, `logout()`). State is persisted to `localStorage` under the key `auth_user` and rehydrated on page load/refresh.

### API Layer

- **Axios instance** (`client/src/api/axios.js`) — configured with:
  - `baseURL` pointing to `VITE_API_URL` (defaults to `http://localhost:5000/api`)
  - **Request interceptor**: Reads `auth_user` from `localStorage` and attaches `Authorization: Bearer <token>` to every request
  - **Response interceptor**: Catches `401`/`403` responses, clears `localStorage`, and hard-redirects to `/login`

### Route Protection

- **ProtectedRoute** wraps every page that requires authentication. It accepts an optional `allowedRoles` prop (e.g., `['admin']`). Unauthenticated users → redirect to `/login`. Wrong role → redirect to `/`.

### Layout

- **Persistent sidebar** (240px) with Lucide React icons. Items are filtered at render time based on `user.role`.
- **Active route highlighting**: Purple left-border accent on the active item.
- **Logout button** fixed at the bottom of the sidebar.
- **Main content area** renders the React Router `<Outlet />`.

---

## 📄 Frontend Pages

| Page | Route | Role | Description |
|---|---|---|---|
| **Login** | `/login` | Public | Username + password + role selector dropdown. Redirects to `/` on success. |
| **Register** | `/register` | Public | User registration form. |
| **Dashboard** | `/` | Admin | 4 stat cards: Total Warehouses, Total Products, Active Orders (assigned), Fulfilled Orders. |
| **Warehouse Management** | `/warehouses` | Admin | Table showing name, city, capacity, dispatch time, cost/km, shipment speed, and status. Add/Edit modal with **LOGISTICS ATTRIBUTES** section for the 3 new fields. Tooltips explain each column. |
| **Inventory Management** | `/inventory` | Admin, Manager | Table of inventory per warehouse × product with editable quantities. Low-stock warning badges appear below a threshold. |
| **Order Management** | `/orders` | Admin, Manager | Table of all orders with status chips (`assigned`, `fulfilled`, `pending`). Includes the Route Order form and Generate Random Order button (admin only). |
| **Routing Decision** | `/routing-decision` or `/routing-decision/:orderId` | Admin, Manager | Leaflet map with red (customer) / green (winner) markers and dashed purple polyline. AI explanation card. Full scoring table showing: Distance, Dispatch (h), Speed (km/d), Delivery (days), Cost (₹), Rate (₹/km), and all four normalized + weighted scores. Eliminated warehouses table with reason chips. |
| **Routing History** | `/routing-history` | Admin, Manager | Historical log of all routing decisions (newest first) with links to the full decision view. |
| **Warehouse Map** | `/map` | Admin, Manager | Full-page Leaflet map showing all warehouse locations with name popups. |
| **Routing Settings** | `/routing-settings` | Admin | Live slider controls for the four scoring weights. Total display shows green (= 100%) or red (≠ 100%). Save button disabled until sum equals exactly 100. Shows last-updated metadata. |

---

## ⏰ Auto-Order Generation (Cron)

The server supports **automatic order generation** using `node-cron`. When enabled, a random order is generated and routed through the full pipeline every **30 seconds**.

### Enabling

Set the environment variable in `server/.env`:

```env
ENABLE_AUTO_ORDERS=true
```

### How It Works

1. A cron job runs every 30 seconds using a **6-field cron expression** (`*/30 * * * * *` — the first field is seconds).
2. Picks a random customer name from a preset list: `"Rahul Sharma"`, `"Priya Patel"`, `"Amit Kumar"`, `"Sneha Reddy"`, `"Vikram Singh"`, `"Anjali Gupta"`, `"Rohan Mehta"`, `"Kavya Nair"` — and appends a random 3-digit number.
3. Generates random latitude/longitude within India's geographic bounds (lat: 8.4–37.6, lng: 68.7–97.25).
4. Picks a random product from the database and a random quantity (1–5 units).
5. Runs the full `orderService.processAndRouteOrder()` pipeline — identical to a manual order submission.
6. Logs the result to the console: `[CRON] Auto-order: Priya Patel 742 → Mumbai Central Hub (score: 0.8214)`

### Manual Random Order

Trigger a single random order via the API:

```bash
POST /api/orders/generate-random
Authorization: Bearer <admin_token>
```

Or click the **"Generate Random Order"** button on the Orders page in the frontend.

---

## ☁️ Deploying to Render

### Step 1 — Push to GitHub

Render deploys from a Git repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/order-routing-engine.git
git branch -M main
git push -u origin main
```

Verify your `.env` file is **NOT** in the GitHub repo (it's listed in `.gitignore`).

### Step 2 — Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub account and select the `order-routing-engine` repo
3. Configure the service:

| Setting | Value |
|---|---|
| **Region** | Singapore (closest to India) |
| **Root Directory** | `server` ← **Critical**: Render builds from this subdirectory |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

### Step 3 — Add Environment Variables

In the **"Environment Variables"** section, add each key manually (do NOT upload `.env`):

| Key | Value |
|---|---|
| `PORT` | `10000` ← Render's required port on free tier |
| `MONGODB_URI` | Your full Atlas connection string |
| `JWT_SECRET` | Your JWT secret |
| `GROQ_API_KEY` | Your Groq API key |
| `ENABLE_AUTO_ORDERS` | `false` |

### Step 4 — Deploy & Verify

Click **Create Web Service**. Watch the Logs tab for:
```
Connected to MongoDB
Server running on port 10000
```

Your live backend URL will be: `https://your-app-name.onrender.com`

Test it:
```bash
curl -X POST https://your-app-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'
```

> ⚠️ **Free Tier Spin-down**: Render's free tier spins down after 15 minutes of inactivity. The first request after wake-up takes ~30–50 seconds. Upgrade to a paid plan to prevent this.

---

## 🧪 Testing

### Integration Tests

The project includes an integration test script at `server/test_routes.js` using `mongodb-memory-server` — no real database needed.

```bash
cd server
node test_routes.js
```

### What the Tests Cover

1. **Database Setup** — Spins up an in-memory MongoDB and connects Mongoose.
2. **Express Test Server** — Starts a separate Express instance on port `5001`.
3. **Seed Test Data** — Creates 2 warehouses (Mumbai: 50 units, Delhi: 2 units), 1 product (Laptop), and inventory entries. The new warehouse logistics fields are seeded too.
4. **`GET /api/warehouses`** — Verifies the listing returns exactly 2 results.
5. **`POST /api/routing/route-order`** — Sends an order from Pune (closer to Mumbai) with `quantity: 1` and verifies:
   - `success: true`
   - A warehouse is selected
   - `allScores` array is present and non-empty
   - `eliminatedWarehouses` array is present
6. **Teardown** — Closes the test server, disconnects Mongoose, stops the in-memory MongoDB.

### Manual API Testing

```bash
# 1. Login to get a token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'

# 2. List warehouses (with new logistics attributes in response)
curl http://localhost:5000/api/warehouses \
  -H "Authorization: Bearer <your_token>"

# 3. Route an order
curl -X POST http://localhost:5000/api/routing/route-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "customerLat": 18.5204,
    "customerLng": 73.8567,
    "productId": "<product_id>",
    "quantity": 1,
    "customerName": "Test User"
  }'
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| **`Failed to connect to MongoDB`** | Verify your `MONGODB_URI` in `server/.env`. Ensure your machine's IP is whitelisted in MongoDB Atlas under Network Access → Add IP Address. |
| **`AI explanation skipped because GROQ_API_KEY is not set`** | Expected if you haven't set `GROQ_API_KEY`. The app still works — routing proceeds and the explanation field returns a static message. |
| **`Token expired` or auto-logout on refresh** | JWT tokens expire after 8 hours. Simply log in again. |
| **CORS errors in browser** | The backend uses `cors()` with default settings (allows all origins). If deploying to a specific domain, add the origin to the cors config in `server.js`. |
| **`No eligible warehouses with sufficient stock found`** | The requested quantity exceeds available stock in all active warehouses. Re-run `node seed.js` to restore inventory, or manually update quantities via the Inventory page. |
| **Leaflet map tiles not loading** | Ensure you have internet access. Tiles are fetched from the OpenStreetMap CDN. |
| **Vite dev server can't reach backend** | Confirm the backend is running on port 5000. Check `VITE_API_URL` in `client/.env`. |
| **`MongoServerSelectionError: connection timed out`** | Check MongoDB Atlas cluster status. Ensure your current IP is whitelisted. You can also increase `serverSelectionTimeoutMS` in `server.js`. |
| **Modal form background is transparent** | This is caused by the MUI theme's `background.paper: rgba(255,255,255,0.05)`. The modal box is fixed with `background: '#13131f'` (solid opaque). If it regresses, check `WarehouseManagement.jsx` line ~150. |
| **Delivery days seem different each time** | Delivery days are now deterministic and physics-based: `(distance_km / shipmentSpeed) + (dispatchTime / 24)`. They are NOT random. They vary by warehouse because each warehouse has a different `shipmentSpeed` and `dispatchTime`. |
| **All warehouses have identical dispatch/cost/speed after seeding** | You likely have old warehouse documents in MongoDB that lack the new fields. Run `node seed.js` to wipe and re-seed, or manually edit each warehouse via the Warehouse Management page. |

---

## 📜 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Built with ❤️ using React, Express, MongoDB, and Groq AI
</p>
