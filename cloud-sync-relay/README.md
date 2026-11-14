# ☁️ Kapse - G 🔰 Cloud Sync Relay (Temporary Queue Server)

This is a lightweight, zero-maintenance temporary cloud storage queue designed for the **Kapse - G 🔰 Tailor Shop Customer Management System**.

---

## 🎯 How It Works

1. **When your laptop is OFF**:
   - Anyone entering customer records on a mobile phone or remote computer connects to this Cloud Relay (or Firebase).
   - Records are held safely in this queue with status `"Pending Sync"`.
2. **When your laptop is switched ON**:
   - The laptop backend starts and connects to this service.
   - It fetches all pending records, inserts them into your laptop's **MySQL database**.
   - It deletes the temporary copy from this cloud queue.
   - **Your laptop's MySQL database remains the permanent source of truth.**

---

## 🚀 Free 1-Click Deployment Options

### Option 1: Render.com (100% Free)
1. Push this repository to GitHub.
2. Sign in to [Render.com](https://render.com) (free).
3. Click **New +** -> **Web Service**.
4. Connect your repo and set:
   - Root Directory: `cloud-sync-relay`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variable: `SYNC_API_KEY=kapse-g-tailor-sync-sec-2026`
5. Render gives you a free HTTPS URL like: `https://kapse-sync-relay.onrender.com`
6. Add this URL to your laptop `.env`:
   ```env
   CLOUD_SYNC_PROVIDER=relay
   CLOUD_SYNC_URL=https://kapse-sync-relay.onrender.com
   SYNC_API_KEY=kapse-g-tailor-sync-sec-2026
   ```

### Option 2: Vercel (100% Free)
1. Deploy `cloud-sync-relay` directory to Vercel.
2. Set Environment Variable: `SYNC_API_KEY=kapse-g-tailor-sync-sec-2026`.
3. Add your Vercel URL to your laptop `.env`.

### Option 3: Firebase Realtime Database (Zero Server Required, Easiest for GitHub Pages)
If you prefer not to deploy any server, you can use Firebase Realtime Database directly!
1. Create a free Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Create a Realtime Database (free tier).
3. Copy your database URL (`https://your-app-default-rtdb.firebaseio.com`).
4. Set in your laptop `.env`:
   ```env
   CLOUD_SYNC_PROVIDER=firebase
   FIREBASE_DB_URL=https://your-app-default-rtdb.firebaseio.com
   ```
5. Done! No servers to manage or keep alive.
