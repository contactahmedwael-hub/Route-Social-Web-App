import { type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Login/register are only for logged-out users — anyone with a session
// token gets sent straight to the app instead.
export default function PublicRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }
  return children;
}