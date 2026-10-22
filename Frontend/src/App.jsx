import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import DriverSidebar from "./components/DriverSidebar.jsx";
import AdminSidebar from "./components/AdminSidebar.jsx";
import SosButton from "./components/SosButton.jsx";
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
import ChooseRole from "./pages/auth/ChooseRole.jsx";
import DriverDashboard from "./pages/driver/DriverDashboard.jsx";
import { DriverRides, RideRequests, Passengers, Earnings, DriverProfile } from "./pages/driver/DriverPages.jsx";
import DriverMessages from "./pages/driver/DriverMessages.jsx";
import DriverVerification from "./pages/driver/DriverVerification.jsx";
import PostRide from "./pages/driver/PostRide.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-cream" aria-busy="true" />;
  return user ? children : <Navigate to="/auth" replace />;
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user?.role !== role || !user?.serviceCity) return <Navigate to="/choose-role" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/auth" replace />;
}

function Layout({ children }) {
  const location = useLocation();
  const authScreen = location.pathname === "/auth" || location.pathname === "/choose-role";
  const driver = location.pathname.startsWith("/driver");
  const admin = location.pathname.startsWith("/admin");
  if (authScreen) return children;
 return (
  <div className="min-h-screen flex flex-col bg-[#f3f3ef] overflow-x-hidden md:flex-row">
    {admin ? <AdminSidebar /> : driver ? <DriverSidebar /> : <Sidebar />}

    <main className="min-h-[calc(100vh-4rem)] min-w-0 flex-1 overflow-y-auto md:min-h-screen">
      {children}
    </main>

    {!driver && !admin && <SosButton />}
  </div>
);
}

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Navigate to="/auth" replace />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/choose-role" element={<RequireAuth><ChooseRole /></RequireAuth>} />
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

    <Route path="*" element={<Navigate to="/auth" replace />} />
  </Routes></Layout>;
}