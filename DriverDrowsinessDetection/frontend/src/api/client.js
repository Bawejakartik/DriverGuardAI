import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v8";
export const AI_URL = import.meta.env.VITE_AI_URL || "http://localhost:5000";

// HTTP-only auth cookie ("Token") is set by the backend on login.
// We never touch localStorage for it — withCredentials sends it automatically.
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// ---------- Auth (server/routes/authRouters.js) ----------
export const authApi = {
  signup: (data) => api.post("/auth/signup", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  profile: () => api.get("/auth/profile"),
};

// ---------- Cars / Vehicles (server/routes/carRouter.js) ----------
export const carApi = {
  list: () => api.get("/cars"),
  get: (id) => api.get(`/cars/${id}`),
  add: (data) => api.post("/cars", data),
  remove: (id) => api.delete(`/cars/${id}`),
};

// ---------- Driving Sessions (server/routes/sessionRoutes.js) ----------
export const sessionApi = {
  start: (carId) => api.post("/sessions/start", { carId }),
  end: (id) => api.post(`/sessions/end/${id}`),
  active: () => api.get("/sessions/active"),
  list: () => api.get("/sessions"),
  get: (id) => api.get(`/sessions/${id}`),
};

// ---------- AI / Attention events (server/routes/attentionRoutes.js) ----------
export const attentionApi = {
  // Statuses the backend actually understands (controller/attentionController.js statusToEventType)
  reportEvent: (payload) => api.post("/ai/driver-event", payload),
  sessionEvents: (sessionId) => api.get(`/ai/session/${sessionId}/events`),
};

// ---------- Dashboard (server/routes/dashboardRouters.js) ----------
export const dashboardApi = {
  overview: () => api.get("/dashboard/overview"),
  sessions: () => api.get("/dashboard/sessions"),
  events: () => api.get("/dashboard/events"),
};

// Helper to pull a readable message out of an axios error.
export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.message || error?.message || fallback;
}
