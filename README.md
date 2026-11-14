# ✂️ Kapse - G 🔰 - Tailor Shop Customer Management System (React + MySQL)

A modern, responsive web application designed for tailor shops to manage customer profiles, bill book numbers, page registries, and measurements.

Converted from vanilla HTML/Excel to a full-stack **React (Vite) + Node.js (Express) + MySQL (InnoDB)** application.

---

## 🌟 Key Features

### 1. Modern React Architecture
- **React Frontend**: Built with React and Vite for blazing-fast performance and Hot Module Replacement (HMR).
- **Responsive Theme**: Professional white layout with Navy Blue (`#0F2942`) and Light Blue (`#0284C7`, `#38BDF8`) accents, tailored icons, and responsive breakpoints.
- **Component Hierarchy**:
  - `Sidebar`: Navigation, active tab indicators, live MySQL database status pill.
  - `Topbar`: Real-time global search bar with instant dropdown preview, quick action shortcuts.
  - `DashboardView`: Live statistics, recently added customers, quick bill book lookup widget.
  - `AddCustomerView`: Full customer registration form with real-time field validation.
  - `CustomerRecordsView`: Data table with multi-column sorting, pagination, search filter, and action buttons.
  - `SearchView`: Instant multi-field live search with rich tailor customer cards.
  - `ViewSlipModal`: Formatted customer measurement & physical bill book slip with **One-Click Print**.
  - `EditCustomerModal`: Full customer updating dialog saving changes to MySQL.
  - `DeleteModal`: Safe confirmation dialog before permanently removing records from MySQL.
  - `ToastContainer`: Toast notifications for success, warning, and error events.

### 2. MySQL Database Engine
- **Persistent Relational Storage**: All customer data is stored in a dedicated MySQL database (`tailor_shop_db`).
- **Database Schema**:
  ```sql
  CREATE TABLE customers (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    place VARCHAR(255) NOT NULL,
    bill_book VARCHAR(50) NOT NULL,
    page_no VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_mobile (mobile),
    INDEX idx_bill_book (bill_book),
    INDEX idx_page_no (page_no)
  );
  ```
- **Connection Pooling**: Utilizes `mysql2/promise` with connection pooling for concurrency and scalability.
- **Auto-Initialization**: Automatically creates `tailor_shop_db` and the `customers` table if they do not exist.
- **Auto-Migration**: Seamlessly imports existing customer records from `customers.xlsx` into MySQL on initial setup if the MySQL table is empty.
- **Excel Export**: Exports live MySQL records into a formatted `.xlsx` spreadsheet on demand.

### 3. Automatic Data Synchronization (Laptop Master + Temporary Cloud Queue)
- **Laptop MySQL as Permanent Master**: All permanent customer records are stored securely in MySQL on your laptop (`tailor_shop_db`).
- **Remote & Mobile Data Entry**: Enter customer profiles from phones, tablets, or remote computers even when your main laptop is **switched OFF**.
- **Temporary Cloud Storage Queue**: Pending records are buffered in a temporary queue (Firebase Realtime Database or Cloud Sync Relay). Records are tagged with status `Pending Sync`.
- **Automatic Laptop Ingestion**: When your laptop is switched ON, the backend connects automatically, fetches all pending records, inserts them transactionally into MySQL, and removes the cloud copies.
- **Strict Duplicate Prevention**: Verifies customer IDs, temporary sync UUIDs, and customer fingerprints `(name, mobile, bill_book, page_no)` to prevent duplicate records.
- **Zero Data Loss Guarantee**: Temporary cloud copies are deleted *only after* successful MySQL transaction confirmation.
- **Dedicated Sync Dashboard**: Real-time monitoring showing Total Pending Records, Successfully Synced Records, Failed Records, Last Sync Time, and "Sync Now" button.

---

## 📁 Project Structure

```
kapseG/
├── .env                     # MySQL database credentials, port & sync configuration
├── .env.example             # Example environment configuration
├── package.json             # Dependencies and npm scripts
├── server.js                # Express backend server (API, sync worker & static server)
├── vite.config.mjs          # Vite React bundler and proxy configuration
├── seed_mysql.js            # MySQL database testing and seeding script
├── test_sync.js             # End-to-end synchronization automated test suite
├── index.html               # Vite HTML entry point
├── services/
│   ├── mysqlService.js      # MySQL connection pool, auto-schema, transactional CRUD
│   ├── cloudSyncService.js  # Cloud queue adapter (Firebase, Cloud Relay, or Local)
│   └── syncWorker.js        # Background automatic synchronization worker
├── routes/
│   ├── customerRoutes.js    # REST API endpoints (/api/customers, /api/export)
│   └── syncRoutes.js        # REST API endpoints (/api/sync/status, /api/sync/trigger)
├── cloud-sync-relay/        # Standalone 1-click deployable cloud queue (Vercel/Render)
│   ├── package.json
│   ├── server.js
│   ├── api/index.js
│   └── README.md
├── src/                     # React source code
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Main React application controller & state
│   ├── index.css            # Tailor shop design system styles & sync UI
│   ├── config/
│   │   └── syncConfig.js    # Client-side cloud sync settings
│   ├── services/
│   │   ├── api.js           # Client-side API service with auto-cloud fallback
│   │   └── clientSyncService.js # Offline queue & unique ID generator
│   └── components/
│       ├── Sidebar.jsx
│       ├── Topbar.jsx
│       ├── DashboardView.jsx
│       ├── AddCustomerView.jsx
│       ├── CustomerRecordsView.jsx
│       ├── SearchView.jsx
│       ├── SyncDashboardView.jsx # Live Synchronization Dashboard
│       ├── ViewSlipModal.jsx
│       ├── EditCustomerModal.jsx
│       ├── DeleteModal.jsx
│       ├── MobileBottomNav.jsx
│       └── Toast.jsx
└── dist/                    # Production React build (generated by vite build)
```

---

## ⚙️ Configuration (`.env`)

Create or edit the `.env` file in the root directory:

```env
# Server Port
PORT=5000

# MySQL Database Connection Settings
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tailor_shop_db
```

> **Note**: Update `DB_PASSWORD` to match your local MySQL root password. The database `tailor_shop_db` and the `customers` table will be created automatically on startup.

---

## 🚀 Installation & Running

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: (Optional) Seed or Test MySQL Connection
```powershell
npm run seed:mysql
```
*This tests your MySQL credentials, creates the database/tables, and migrates or seeds sample customer records.*

### Step 3: Run the Application

#### Option A: Development Mode (Hot-Reload)
Runs both the Express backend and the Vite React development server concurrently:
```powershell
npm run dev
```
- **React Frontend**: Open `http://localhost:3000` (auto-proxies API calls to port 5000)
- **Backend API**: Running at `http://localhost:5000`

#### Option B: Production Mode
Builds the optimized React bundle into `dist/` and serves everything through Express:
```powershell
npm run build
npm start
```
- Open your browser at `http://localhost:5000`

---

## 🔌 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Check MySQL database connectivity status |
| `GET` | `/api/stats` | Dashboard statistics (total customers, today's registrations, bill books) |
| `GET` | `/api/customers` | Fetch all records from MySQL (supports `?search=`, `?sortBy=`, `?order=`) |
| `GET` | `/api/customers/:id` | Fetch single customer by ID |
| `POST` | `/api/customers` | Add a new customer to MySQL |
| `PUT` | `/api/customers/:id` | Update an existing customer in MySQL |
| `DELETE` | `/api/customers/:id` | Permanently delete a customer from MySQL |
| `GET` | `/api/export` | Export customer records from MySQL into Excel (`.xlsx`) |
| `GET` | `/api/sync/status` | Live synchronization status, pending count, synced count |
| `POST` | `/api/sync/trigger` | "Sync Now" button trigger - ingest pending cloud records into MySQL |
| `GET` | `/api/sync/logs` | Fetch sync audit trail logs from MySQL `sync_logs` table |
| `POST` | `/api/sync/test` | Complete end-to-end synchronization automated pipeline test |
| `GET` | `/api/sync/cloud-queue/pending` | Temporary queue - fetch pending records |
| `POST` | `/api/sync/cloud-queue/pending` | Temporary queue - store pending customer from mobile/remote |
| `DELETE` | `/api/sync/cloud-queue/pending/:id` | Temporary queue - delete record after confirmed MySQL insertion |

---

## 🧪 Testing the Synchronization System

Run the automated integration test suite to verify the complete lifecycle:
```powershell
node test_sync.js
```
This test performs:
1. Connects to your laptop MySQL database.
2. Simulates a mobile device data entry while laptop is OFF (generates collision-free `CUST-S-xxxx` ID).
3. Buffers the record into the Temporary Cloud Storage Queue.
4. Triggers automatic synchronization on the laptop backend.
5. Ingests record into MySQL `tailor_shop_db.customers`.
6. Confirms permanent MySQL record existence.
7. Confirms temporary cloud copy was removed.
8. Tests duplicate prevention: re-submits identical data and verifies MySQL is NOT duplicated.
9. Writes and verifies audit logs in MySQL `sync_logs`.

---

## ✂️ Tailor Shop Specific Workflow Features
1. **Bill Book & Page Number Registry**: Designed for quick lookup of physical customer measurement books and fabric swatches.
2. **Instant Search**: Type name, phone number, or bill book number to find matching records immediately.
3. **Printable Measurement Slip**: One-click physical measurement printout formatted like a physical tailor slip.
4. **Excel Export**: Even with MySQL as the primary database, you can export all customer records to `.xlsx` anytime with a single click.
