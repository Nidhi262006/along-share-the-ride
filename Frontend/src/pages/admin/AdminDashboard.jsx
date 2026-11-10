import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Check, Eye, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { getAdminOverview, getAdminUser, listAdminApplications, listAdminReports, getAdminRides, moderateRide, reviewDriver, searchAdminUsers, setAccountSuspension, updateAdminReport, downloadDriverDocument } from "../../services/adminService.js";
import { formatPlace } from "../../utils/display.js";

const sections = {
  "/admin": "overview",
  "/admin/users": "users",
  "/admin/drivers": "drivers",
  "/admin/rides": "rides",
  "/admin/reports": "reports",
};

function Stat({ label, value }) {
  return <div className="bg-white border border-cardBorder rounded-xl p-4"><p className="text-xs text-inkMuted">{label}</p><p className="font-heading text-2xl font-semibold mt-2">{value ?? "—"}</p></div>;
}

export default function AdminDashboard() {
  const section = sections[useLocation().pathname] || "overview";
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [rides, setRides] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (documentPreview?.url) window.setTimeout(() => URL.revokeObjectURL(documentPreview.url), 60000);
    };
  }, [documentPreview?.url]);

  async function refresh() {
    setError("");
    try {
      if (section === "overview") setOverview(await getAdminOverview());
      if (section === "users") setUsers((await searchAdminUsers({ search, role })).users);
      if (section === "drivers") {
        setApplicationsLoading(true);
        setApplications((await listAdminApplications()).applications);
      }
      if (section === "rides") setRides((await getAdminRides()).rides);
      if (section === "reports") setReports((await listAdminReports()).reports);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (section === "drivers") setApplicationsLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [section]);

  async function runAction(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function showUser(userId) {
    try {
      setSelectedUser(await getAdminUser(userId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function suspension(user) {
    const suspend = !user.isSuspended;
    if (!window.confirm(`${suspend ? "Suspend" : "Reactivate"} ${user.name}? ${suspend ? "Their active future rides/bookings will be cancelled where applicable." : "They will regain account access."}`)) return;
    await runAction(() => setAccountSuspension(user._id, suspend));
  }

  async function verification(application, status) {
    const reason = status === "rejected" ? window.prompt("Enter the reason the driver must correct before resubmitting:") : "";
    if (status === "rejected" && (!reason || reason.trim().length < 5)) return;
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} ${application.user.name}'s driver application?`)) return;
    await runAction(() => reviewDriver(application.user._id, status, reason || ""));
  }

  async function openDocument(driverId, documentId) {
    try {
      const blob = await downloadDriverDocument(driverId, documentId);
      const url = URL.createObjectURL(blob);
      setDocumentPreview({ url, blob });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function moderate(ride) {
    const reason = window.prompt("Why is this listing being removed?");
    if (!reason || reason.trim().length < 5) return;
    if (!window.confirm(`Cancel and remove the ride from ${formatPlace(ride.pickup.address)} to ${formatPlace(ride.destination.address)}? Associated active bookings will be cancelled.`)) return;
    await runAction(() => moderateRide(ride._id, reason));
  }

  async function resolveReport(report, status) {
    const resolution = status === "investigating" ? "Investigation started" : window.prompt("Enter the resolution or dismissal reason:");
    if (!resolution || resolution.trim().length < 5) return;
    if (!window.confirm(`Set report status to ${status}?`)) return;
    await runAction(() => updateAdminReport(report._id, status, resolution));
  }

  const title = { overview: "Administration", users: "User management", drivers: "Driver verification", rides: "Ride moderation", reports: "User reports" }[section];

  return <div className="min-h-screen bg-[#f7f3ed] p-4 sm:p-6 lg:p-8">
    <div className="max-w-6xl mx-auto">
      <header className="mb-6"><p className="text-xs text-inkMuted">along · Admin</p><h1 className="font-heading text-2xl sm:text-3xl font-semibold mt-1">{title}</h1></header>
      {error && <p role="alert" className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      {section === "overview" && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total users" value={overview?.stats.totalUsers} /><Stat label="Passengers" value={overview?.stats.passengers} /><Stat label="Drivers" value={overview?.stats.drivers} /><Stat label="Active rides" value={overview?.stats.activeRides} /><Stat label="Upcoming rides" value={overview?.stats.upcomingRides} /><Stat label="Bookings" value={overview?.stats.bookings} /><Stat label="Awaiting verification" value={overview?.stats.pendingDrivers} /><Stat label="Unresolved reports" value={overview?.stats.unresolvedReports} />
        </div>
        <section className="mt-6 bg-white border border-cardBorder rounded-xl p-4 sm:p-5"><h2 className="font-heading font-semibold">Recent admin activity</h2>
          {!overview?.activity?.length ? <p className="text-sm text-inkMuted mt-3">No administrative actions recorded yet.</p> : <div className="mt-3 divide-y divide-cardBorder">{overview.activity.map((entry) => <div key={entry._id} className="py-3 flex flex-wrap justify-between gap-2"><span className="text-sm">{entry.action.replaceAll("_", " ")} · {entry.targetType}</span><span className="text-xs text-inkMuted">{entry.admin?.name || "Admin"} · {new Date(entry.createdAt).toLocaleString()}</span></div>)}</div>}
        </section>
      </>}

      {section === "users" && <>
        <form onSubmit={(event) => { event.preventDefault(); refresh(); }} className="flex flex-col sm:flex-row gap-2 mb-4">
          <label className="flex items-center gap-2 flex-1 rounded-lg bg-white border border-cardBorder px-3 py-2"><Search size={16} className="text-inkMuted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full text-sm outline-none" /></label>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg bg-white border border-cardBorder px-3 py-2 text-sm"><option value="">All users</option><option value="passenger">Passenger</option><option value="driver">Driver</option></select>
          <button className="rounded-lg bg-plum px-4 py-2 text-sm text-white">Search</button>
        </form>
        <div className="space-y-2">{users.map((user) => <div key={user._id} className="bg-white border border-cardBorder rounded-xl p-4 flex flex-wrap items-center gap-3">
          <UserRound size={18} className="text-inkMuted" /><button onClick={() => showUser(user._id)} className="text-left flex-1 min-w-[180px]"><span className="block text-sm font-medium">{user.name}</span><span className="block text-xs text-inkMuted">{user.email} · {user.serviceCity || "No city"} · {user.driverVerificationStatus || user.role}</span></button>
          <span className={`text-xs ${user.isSuspended ? "text-coral" : "text-sage"}`}>{user.isSuspended ? "Suspended" : "Active"}</span><button disabled={busy} onClick={() => suspension(user)} className="rounded-lg border border-cardBorder px-3 py-2 text-xs">{user.isSuspended ? "Reactivate" : "Suspend"}</button>
        </div>)}</div>
        {selectedUser && <section className="mt-5 bg-white border border-cardBorder rounded-xl p-4"><div className="flex justify-between gap-3"><h2 className="font-heading font-semibold">{selectedUser.user.name} · History</h2><button onClick={() => setSelectedUser(null)} aria-label="Close user history"><X size={17} /></button></div><p className="text-xs text-inkMuted mt-2">{selectedUser.user.email} · {selectedUser.user.role} · {selectedUser.user.driverVerificationStatus}</p><div className="grid md:grid-cols-2 gap-4 mt-4"><div><h3 className="text-sm font-medium">Posted rides</h3>{selectedUser.rides.map((ride) => <p key={ride._id} title={`${ride.pickup.address} → ${ride.destination.address}`} className="mt-2 line-clamp-2 text-xs text-inkMuted">{formatPlace(ride.pickup.address)} → {formatPlace(ride.destination.address)} · {ride.status}</p>)}</div><div><h3 className="text-sm font-medium">Passenger bookings</h3>{selectedUser.bookings.map((booking) => <p key={booking._id} title={`${booking.ride.pickup.address} → ${booking.ride.destination.address}`} className="mt-2 line-clamp-2 text-xs text-inkMuted">{formatPlace(booking.ride.pickup.address)} → {formatPlace(booking.ride.destination.address)} · {booking.status} · ₹{booking.totalFare}</p>)}</div></div></section>}
      </>}

      {section === "drivers" && <div className="space-y-3">{applicationsLoading && <p className="bg-white rounded-xl p-6 text-sm text-inkMuted">Loading driver applications...</p>}{!applicationsLoading && applications.length === 0 && <p className="bg-white rounded-xl p-6 text-sm text-inkMuted">No driver applications to review.</p>}{applications.map(({ user, documents }) => {
        const submittedAt = user.driverVerificationSubmittedAt || documents[0]?.createdAt;
        return <article key={user._id} className="bg-white border border-cardBorder rounded-xl p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-medium">{user.name}</h2><p className="text-xs text-inkMuted mt-1">{user.email} · {user.serviceCity} · {user.driverVerificationStatus}</p><p className="text-xs text-inkMuted mt-1">{Object.values(user.driverProfile || {}).join(" · ")}</p><p className="text-xs text-inkMuted mt-1">Submitted: {submittedAt ? new Date(submittedAt).toLocaleString() : "Date unavailable"}</p>{user.driverVerificationReviewedAt && <p className="text-xs text-inkMuted mt-1">Reviewed: {new Date(user.driverVerificationReviewedAt).toLocaleString()}{user.driverVerificationReviewedBy?.name ? ` by ${user.driverVerificationReviewedBy.name}` : ""}</p>}{user.driverRejectionReason && <p className="text-sm text-coral mt-2">Rejection reason: {user.driverRejectionReason}</p>}</div><span className="text-xs text-inkMuted">{user.isSuspended ? "Account suspended" : "Account active"}</span></div>
        <div className="flex flex-wrap gap-2 mt-4">{documents.map((document) => <button key={document._id} onClick={() => openDocument(user._id, document._id)} className="inline-flex items-center gap-2 rounded-lg border border-cardBorder px-3 py-2 text-xs"><Eye size={14} />View {document.type} · v{document.revision} · {document.status}</button>)}</div>
        {user.driverVerificationStatus === "pending" && <div className="flex gap-2 mt-4"><button disabled={busy || user.isSuspended} onClick={() => verification({ user }, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-sage px-3 py-2 text-xs text-white disabled:opacity-50"><Check size={14} />Approve</button><button disabled={busy} onClick={() => verification({ user }, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-coral px-3 py-2 text-xs text-white disabled:opacity-50"><X size={14} />Reject</button></div>}
      </article>;
      })}</div>}

      {section === "rides" && <div className="space-y-2">{rides.map((ride) => <article key={ride._id} className="bg-white border border-cardBorder rounded-xl p-4 flex flex-wrap items-center gap-3"><div className="flex-1 min-w-[240px]"><p title={`${ride.pickup.address} → ${ride.destination.address}`} className="line-clamp-2 text-sm font-medium">{formatPlace(ride.pickup.address)} → {formatPlace(ride.destination.address)}</p><p className="text-xs text-inkMuted mt-1">{ride.driver?.name} · {ride.city} · {ride.status} · {new Date(ride.departureTime).toLocaleString()}</p><p className="text-xs text-inkMuted mt-1">₹{ride.fare}/seat · {ride.seatsAvailable}/{ride.seats} available</p>{ride.moderation?.reason && <p className="text-xs text-coral mt-1">Moderation: {ride.moderation.reason}</p>}</div>{["open", "full"].includes(ride.status) && <button disabled={busy} onClick={() => moderate(ride)} className="inline-flex items-center gap-1 rounded-lg border border-coral px-3 py-2 text-xs text-coral"><AlertTriangle size={14} />Remove listing</button>}</article>)}</div>}

      {section === "reports" && <div className="space-y-3">{reports.length === 0 && <p className="bg-white rounded-xl p-6 text-sm text-inkMuted">No reports have been submitted.</p>}{reports.map((report) => <article key={report._id} className="bg-white border border-cardBorder rounded-xl p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-medium">{report.category.replaceAll("_", " ")} · {report.status}</h2><time className="text-xs text-inkMuted">{new Date(report.createdAt).toLocaleString()}</time></div><p className="text-sm mt-2">{report.description}</p><p title={report.ride ? `${report.ride.pickup.address} → ${report.ride.destination.address}` : undefined} className="line-clamp-2 text-xs text-inkMuted mt-2">Reported by {report.reporter?.name || "User"}{report.ride ? ` · ${formatPlace(report.ride.pickup.address)} → ${formatPlace(report.ride.destination.address)}` : ""}</p>{report.resolution && <p className="text-xs text-sage mt-2">Resolution: {report.resolution}</p>}{["open", "investigating"].includes(report.status) && <div className="flex flex-wrap gap-2 mt-4"><button disabled={busy} onClick={() => resolveReport(report, "investigating")} className="rounded-lg border border-cardBorder px-3 py-2 text-xs">Investigate</button><button disabled={busy} onClick={() => resolveReport(report, "resolved")} className="rounded-lg bg-sage px-3 py-2 text-xs text-white">Resolve</button><button disabled={busy} onClick={() => resolveReport(report, "dismissed")} className="rounded-lg border border-cardBorder px-3 py-2 text-xs">Dismiss</button></div>}</article>)}</div>}
    </div>
    {documentPreview && <div role="dialog" aria-modal="true" aria-label="Private driver document" className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onClick={() => setDocumentPreview(null)}>
      <section className="relative w-full max-w-3xl max-h-full overflow-auto rounded-xl bg-white p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setDocumentPreview(null)} aria-label="Close document preview" className="absolute right-3 top-3 rounded-lg border border-cardBorder p-2"><X size={16} /></button>
        <h2 className="pr-10 font-heading font-semibold">Private driver document</h2>
        {documentPreview.blob.type.startsWith("image/") ? <img src={documentPreview.url} alt="Uploaded driver verification document" className="mt-4 max-h-[75vh] max-w-full mx-auto object-contain" />
          : <div className="mt-4 rounded-lg bg-cream p-5 text-sm"><p>PDF document</p><a href={documentPreview.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-plum px-4 py-2 text-white">Open PDF in new tab</a></div>}
      </section>
    </div>}
  </div>;
}