import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Clock3, LoaderCircle } from "lucide-react";
import DocumentUpload from "../../components/DocumentUpload.jsx";
import { Page } from "./DriverPages.jsx";
import { getDriverApplication, saveDriverProfile, submitDriverApplication, uploadDriverDocument } from "../../services/driverService.js";

const REQUIRED_DOCS = [
  { key: "license", label: "Driving License", hint: "Upload a clear photo of the front side" },
  { key: "government_id", label: "Government ID", hint: "Aadhaar, PAN, or any valid photo ID" },
  { key: "vehicle_rc", label: "Vehicle RC", hint: "Registration certificate for the vehicle you drive" },
];

export default function DriverVerification() {
  const [docs, setDocs] = useState({});
  const [profile, setProfile] = useState({ phone: "", licenseNumber: "", vehicleMake: "", vehicleModel: "", vehicleRegistration: "" });
  const [status, setStatus] = useState("not_submitted");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getDriverApplication().then((application) => {
      if (!active) return;
      setProfile({ phone: "", licenseNumber: "", vehicleMake: "", vehicleModel: "", vehicleRegistration: "", ...application.profile });
      setStatus(application.status);
      setRejectionReason(application.rejectionReason);
      const latest = {};
      application.documents.forEach((document) => { if (!latest[document.type]) latest[document.type] = document; });
      setDocs(latest);
    }).catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const uploadedCount = REQUIRED_DOCS.filter((document) => docs[document.key]).length;
  const approved = status === "approved";
  const allUploaded = uploadedCount === REQUIRED_DOCS.length;

  async function updateProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await saveDriverProfile(profile);
      setStatus(result.status);
      setRejectionReason(result.rejectionReason);
      setNotice("Driver details saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(type, file) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const document = await uploadDriverDocument(type, file);
      setDocs((current) => ({ ...current, [type]: document }));
      const application = await getDriverApplication();
      setStatus(application.status);
      setRejectionReason(application.rejectionReason);
      setNotice("Document uploaded securely.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitApplication() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveDriverProfile(profile);
      const result = await submitDriverApplication();
      setStatus(result.status);
      setRejectionReason("");
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Get verified" subtitle="Upload your documents so passengers know they can trust you">
      {loading ? <p className="text-sm text-inkMuted">Loading your application...</p> : <>
        <div className={`rounded-xl p-5 sm:p-6 mb-5 flex items-center gap-4 ${approved ? "bg-sage/15" : "bg-white border border-cardBorder"}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${approved ? "bg-sage/20 text-sage" : "bg-cream text-rose"}`}>{approved ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</div>
          <div className="min-w-0"><p className="text-sm font-medium text-ink">Verification: {status.replaceAll("_", " ")}</p><p className="text-xs text-inkMuted mt-1">{status === "pending" ? <><Clock3 size={12} className="inline" /> Application submitted for review</> : `${uploadedCount} of ${REQUIRED_DOCS.length} required documents uploaded`}</p>{status === "rejected" && rejectionReason && <p className="text-sm text-coral mt-2">Reason: {rejectionReason}</p>}</div>
        </div>
        <form onSubmit={updateProfile} className="bg-white border border-cardBorder rounded-xl p-5 mb-5">
          <h2 className="font-heading font-semibold text-ink">Driver details</h2>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {[["phone", "Phone number"], ["licenseNumber", "License number"], ["vehicleMake", "Vehicle make"], ["vehicleModel", "Vehicle model"], ["vehicleRegistration", "Vehicle registration"]].map(([key, label]) => <label key={key} className="text-xs text-inkMuted">{label}<input required maxLength={80} value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} className="block mt-1 w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none" /></label>)}
          </div>
          <button disabled={busy || status === "pending"} className="mt-4 rounded-lg border border-cardBorder px-4 py-2 text-sm disabled:opacity-50">Save details</button>
        </form>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REQUIRED_DOCS.map((document) => <div key={document.key}>
            <DocumentUpload label={document.label} hint={document.hint} file={docs[document.key]} onSelect={(file) => uploadDocument(document.key, file)} accept="image/jpeg,image/png,application/pdf" />
            {docs[document.key]?.status && <p className="mt-1 text-xs text-inkMuted">Document status: {docs[document.key].status}{docs[document.key].rejectionReason ? ` · ${docs[document.key].rejectionReason}` : ""}</p>}
          </div>)}
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-coral">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm text-sage">{notice}</p>}
        {!approved && status !== "pending" && <button type="button" disabled={busy || !allUploaded} onClick={submitApplication} className="mt-5 w-full rounded-lg bg-rose py-3 text-sm font-medium text-plumText disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin inline" /> : status === "rejected" ? "Resubmit application" : "Submit application for review"}</button>}
      </>}
    </Page>
  );
}