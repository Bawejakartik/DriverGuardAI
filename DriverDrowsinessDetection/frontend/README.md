# DriverGuard AI — Frontend

React + Vite frontend for DriverGuard AI. Integrates with:
- the existing Node.js/Express backend (`server/`) for auth, vehicles, sessions, dashboard, and event persistence (HTTP-only cookie auth)
- the existing Python Flask + Socket.IO AI engine (`DriverDrowsinessDetection/app.py`) for the live camera feed and real-time EAR/MAR/head-pose metrics

## Setup

```bash
cp .env.example .env   # adjust URLs if your backend/AI engine run elsewhere
npm install
npm run dev
```

Defaults (from `.env.example`):
- `VITE_API_URL=http://localhost:4000/api/v8` (Node backend)
- `VITE_AI_URL=http://localhost:5000` (Python AI engine — camera stream + Socket.IO metrics)

## Running the full stack

1. Start MongoDB, then the Node backend: `cd server && npm run dev` (port 4000)
2. Start the Python AI engine: `cd DriverDrowsinessDetection && python app.py` (port 5000)
3. Start this frontend: `npm run dev` (port 5173)

## App flow

Signup → Login → Dashboard → Vehicles → Live Drive (start session → connect to AI engine → live camera + metrics + alerts → stop session) → Session Report → History → Profile → Logout.

## Notes

- Auth uses the backend's HTTP-only `Token` cookie (`withCredentials: true`) — no tokens are stored in `localStorage`.
- The Live Drive page only persists driver-status events the backend's `attentionController` actually understands (`ALERT`, `EYES CLOSED`, `DROWSY`, `YAWNING`, `HEAD NODDING`). Other live statuses emitted by the AI engine (e.g. `FATIGUE TREND`, `NO FACE`) are still shown in the UI but not written to the database, since the backend has no matching event type for them.
