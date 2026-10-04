import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SuggestedFriends from "./SuggestedFriends";
import { useAuth } from "../../context/AuthContext";

export default function MainLayout() {
  const { refreshProfile } = useAuth();
  const { pathname } = useLocation();

  // Profile pages (/profile and /profile/:userId) take the full width —
  // both the left nav and the right suggested-friends rail are hidden.
  // The Notifications page also takes the full width (see the design reference).
  const isProfileRoute =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/notifications";

  useEffect(() => {
    refreshProfile().catch(() => {
      // non-fatal — the cached user data from login/signup is still shown
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col lg:flex-row items-start gap-6">
        {!isProfileRoute && <Sidebar />}
        <main className="flex-1 min-w-0 w-full">
          <Outlet />
        </main>
        {!isProfileRoute && <SuggestedFriends />}
      </div>
    </div>
  );
}