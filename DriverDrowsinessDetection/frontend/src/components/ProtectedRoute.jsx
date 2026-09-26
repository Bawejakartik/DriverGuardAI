import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-page-spinner">
        <Spinner label="Checking your session..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
