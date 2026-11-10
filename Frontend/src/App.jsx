import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import SosButton from "./components/SosButton.jsx";
import AppHeader from "./components/dashboard/AppHeader.jsx";
import AppFooter from "./components/dashboard/AppFooter.jsx";
import Home from "./pages/Home.jsx";
import FindRide from "./pages/FindRide.jsx";
import MyRides from "./pages/MyRides.jsx";
import Messages from "./pages/Messages.jsx";
import Notifications from "./pages/Notifications.jsx";
import Wallet from "./pages/Wallet.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import Safety from "./pages/Safety.jsx";
import Auth from "./pages/auth/Auth.jsx";
import DriverDashboard from "./pages/driver/DriverDashboard.jsx";
import { DriverRides, RideRequests, Passengers, Earnings, DriverProfile } from "./pages/driver/DriverPages.jsx";
import DriverMessages from "./pages/driver/DriverMessages.jsx";
import DriverVerification from "./pages/driver/DriverVerification.jsx";
import PostRide from "./pages/driver/PostRide.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function dashboardPath(user) {
  if (user?.role === "admin") return "/admin";
  if (user?.role === "driver") return "/driver";
  return "/passenger";
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-white" aria-busy="true" />;
  return user ? children : <Navigate to="/auth" replace />;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Navigate to={dashboardPath(user)} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/auth" replace />;
}

function EntryRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-white" aria-busy="true" />;
  return <Navigate to={user ? dashboardPath(user) : "/auth"} replace />;
}

function Layout({ children }) {
  const location = useLocation();
  if (location.pathname === "/auth") return children;
  const driver = location.pathname.startsWith("/driver");
  const admin = location.pathname.startsWith("/admin");
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#241c33]">
      <AppHeader />
      <main className="min-w-0 flex-1">{children}</main>
      <AppFooter />
      {!driver && !admin && <SosButton />}
    </div>
  );
}

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<EntryRedirect />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/admin/*" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />

    <Route path="/passenger" element={<RequireAuth><RequireRole role="passenger"><Home /></RequireRole></RequireAuth>} />
    <Route path="/find-ride" element={<RequireAuth><RequireRole role="passenger"><FindRide /></RequireRole></RequireAuth>} />
    <Route path="/my-rides" element={<RequireAuth><RequireRole role="passenger"><MyRides /></RequireRole></RequireAuth>} />
    <Route path="/messages" element={<RequireAuth><RequireRole role="passenger"><Messages /></RequireRole></RequireAuth>} />
    <Route path="/notifications" element={<RequireAuth><RequireRole role="passenger"><Notifications /></RequireRole></RequireAuth>} />
    <Route path="/wallet" element={<RequireAuth><RequireRole role="passenger"><Wallet /></RequireRole></RequireAuth>} />
    <Route path="/safety" element={<RequireAuth><RequireRole role="passenger"><Safety /></RequireRole></RequireAuth>} />
    <Route path="/profile" element={<RequireAuth><RequireRole role="passenger"><Profile /></RequireRole></RequireAuth>} />
    <Route path="/settings" element={<RequireAuth><RequireRole role="passenger"><Settings /></RequireRole></RequireAuth>} />

    <Route path="/driver" element={<RequireAuth><RequireRole role="driver"><DriverDashboard /></RequireRole></RequireAuth>} />
    <Route path="/driver/rides" element={<RequireAuth><RequireRole role="driver"><DriverRides /></RequireRole></RequireAuth>} />
    <Route path="/driver/post-ride" element={<RequireAuth><RequireRole role="driver"><PostRide /></RequireRole></RequireAuth>} />
    <Route path="/driver/post-ride/:rideId" element={<RequireAuth><RequireRole role="driver"><PostRide /></RequireRole></RequireAuth>} />
    <Route path="/driver/requests" element={<RequireAuth><RequireRole role="driver"><RideRequests /></RequireRole></RequireAuth>} />
    <Route path="/driver/passengers" element={<RequireAuth><RequireRole role="driver"><Passengers /></RequireRole></RequireAuth>} />
    <Route path="/driver/messages" element={<RequireAuth><RequireRole role="driver"><DriverMessages /></RequireRole></RequireAuth>} />
    <Route path="/driver/notifications" element={<RequireAuth><RequireRole role="driver"><Notifications /></RequireRole></RequireAuth>} />
    <Route path="/driver/earnings" element={<RequireAuth><RequireRole role="driver"><Earnings /></RequireRole></RequireAuth>} />
    <Route path="/driver/verification" element={<RequireAuth><RequireRole role="driver"><DriverVerification /></RequireRole></RequireAuth>} />
    <Route path="/driver/profile" element={<RequireAuth><RequireRole role="driver"><DriverProfile /></RequireRole></RequireAuth>} />
    <Route path="/driver/settings" element={<RequireAuth><RequireRole role="driver"><Settings /></RequireRole></RequireAuth>} />

    <Route path="*" element={<EntryRedirect />} />
  </Routes></Layout>;
}
