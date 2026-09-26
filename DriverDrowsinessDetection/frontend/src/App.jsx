import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import LiveDrive from "./pages/LiveDrive";
import History from "./pages/History";
import SessionDetails from "./pages/SessionDetails";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Spinner from "./components/Spinner";

function withLayout(element) {
  return (
    <ProtectedRoute>
      <Layout>{element}</Layout>
    </ProtectedRoute>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="full-page-spinner">
        <Spinner label="Loading DriverGuard AI..." />
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/dashboard" element={withLayout(<Dashboard />)} />
      <Route path="/vehicles" element={withLayout(<Vehicles />)} />
      <Route path="/drive" element={withLayout(<LiveDrive />)} />
      <Route path="/history" element={withLayout(<History />)} />
      <Route path="/history/:id" element={withLayout(<SessionDetails />)} />
      <Route path="/profile" element={withLayout(<Profile />)} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
