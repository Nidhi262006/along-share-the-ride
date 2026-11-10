const express = require("express");
const DriverDocument = require("../model/DriverDocument");
const { requireAuth, requireRole } = require("../middleware/auth");
const { cancelDriverFutureRides } = require("../services/rideLifecycle");

const router = express.Router();
const DOCUMENT_TYPES = ["license", "government_id", "vehicle_rc"];
const DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

router.use(requireAuth, requireRole("driver"));

function publicDocument(document) {
  return {
    id: document._id,
    type: document.type,
    originalName: document.originalName,
    contentType: document.contentType,
    revision: document.revision,
    status: document.status,
    rejectionReason: document.rejectionReason,
    createdAt: document.createdAt,
  };
}

function validProfile(profile = {}) {
  const fields = ["phone", "licenseNumber", "vehicleMake", "vehicleModel", "vehicleRegistration"];
  const result = {};
  for (const field of fields) {
    if (typeof profile[field] !== "string" || !profile[field].trim() || profile[field].trim().length > 80) {
      return { error: `Enter a valid ${field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}` };
    }
    result[field] = profile[field].trim();
  }
  if (result.phone.length > 30) return { error: "Enter a valid phone number" };
  return { fields: result };
}

async function markDocumentsPending(driverId) {
  await DriverDocument.updateMany(
    { driver: driverId, status: { $ne: "pending" } },
    { $set: { status: "pending", rejectionReason: "" } }
  );
}

router.get("/application", async (req, res, next) => {
  try {
    const documents = await DriverDocument.find({ driver: req.user._id }).sort({ type: 1, revision: -1 });
    return res.json({
      profile: req.user.driverProfile || {},
      status: req.user.driverVerificationStatus || "not_submitted",
      rejectionReason: req.user.driverRejectionReason || "",
      submittedAt: req.user.driverVerificationSubmittedAt || null,
      reviewedAt: req.user.driverVerificationReviewedAt || null,
      documents: documents.map(publicDocument),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/application", async (req, res, next) => {
  const { fields, error } = validProfile(req.body?.profile);
  if (error) return res.status(400).json({ message: error });
  try {
    const wasApproved = req.user.driverVerificationStatus === "approved";
    const detailsChanged = Object.keys(fields).some((field) => fields[field] !== req.user.driverProfile?.[field]);
    req.user.driverProfile = fields;
    if (wasApproved && detailsChanged) {
      req.user.driverVerificationStatus = "pending";
      req.user.driverRejectionReason = "";
      req.user.isVerified = false;
      req.user.driverVerificationSubmittedAt = new Date();
      req.user.driverVerificationReviewedBy = null;
      req.user.driverVerificationReviewedAt = null;
    }
    await req.user.save();
    if (wasApproved && detailsChanged) {
      await markDocumentsPending(req.user._id);
      await cancelDriverFutureRides(req.user._id);
    }
    return res.json({ profile: req.user.driverProfile, status: req.user.driverVerificationStatus, rejectionReason: req.user.driverRejectionReason });
  } catch (requestError) {
    return next(requestError);
  }
});

router.put("/application/documents/:type", express.raw({ type: DOCUMENT_MIME_TYPES, limit: "5mb" }), async (req, res, next) => {
  if (!DOCUMENT_TYPES.includes(req.params.type)) return res.status(400).json({ message: "Unsupported document type" });
  if (req.user.driverVerificationStatus === "pending") return res.status(409).json({ message: "Your application is under review. Wait for the decision before replacing documents." });
  const contentType = req.headers["content-type"]?.split(";")[0];
  if (!DOCUMENT_MIME_TYPES.includes(contentType) || !Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ message: "Upload a JPG, PNG, or PDF document" });
  }
  const file = req.body;
  const validSignature = contentType === "application/pdf" ? file.subarray(0, 5).toString() === "%PDF-"
    : contentType === "image/png" ? file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file[0] === 0xff && file[1] === 0xd8 && file[file.length - 2] === 0xff && file[file.length - 1] === 0xd9;
  if (!validSignature) return res.status(400).json({ message: "The document content does not match its file type" });
  let originalName = "document";
  if (typeof req.headers["x-file-name"] === "string") {
    try {
      originalName = decodeURIComponent(req.headers["x-file-name"]).split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, "").slice(0, 200) || "document";
    } catch {
      return res.status(400).json({ message: "Invalid document filename" });
    }
  }
  try {
    const previous = await DriverDocument.findOne({ driver: req.user._id, type: req.params.type }).sort({ revision: -1 });
    const document = await DriverDocument.create({
      driver: req.user._id,
      type: req.params.type,
      fileData: file,
      contentType,
      originalName,
      revision: (previous?.revision || 0) + 1,
      revisionKey: `${req.user._id}:${req.params.type}:${(previous?.revision || 0) + 1}`,
      status: "pending",
    });
    if (req.user.driverVerificationStatus === "approved") {
      req.user.driverVerificationStatus = "pending";
      req.user.driverRejectionReason = "";
      req.user.isVerified = false;
      req.user.driverVerificationSubmittedAt = new Date();
      req.user.driverVerificationReviewedBy = null;
      req.user.driverVerificationReviewedAt = null;
      await req.user.save();
      await markDocumentsPending(req.user._id);
      await cancelDriverFutureRides(req.user._id);
    }
    return res.status(201).json({ document: publicDocument(document) });
  } catch (error) {
    return next(error);
  }
});

router.post("/application/submit", async (req, res, next) => {
  const { fields, error } = validProfile(req.user.driverProfile);
  if (error) return res.status(400).json({ message: `Complete your driver profile: ${error}` });
  try {
    const latestDocuments = await DriverDocument.aggregate([
      { $match: { driver: req.user._id } },
      { $sort: { revision: -1, createdAt: -1 } },
      { $group: { _id: "$type" } },
    ]);
    const uploadedTypes = new Set(latestDocuments.map((item) => item._id));
    const missing = DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type));
    if (missing.length) return res.status(400).json({ message: `Upload required documents: ${missing.join(", ")}` });
    if (req.user.driverVerificationStatus === "pending") return res.status(409).json({ message: "Your application is already under review" });
    req.user.driverProfile = fields;
    req.user.driverVerificationStatus = "pending";
    req.user.driverRejectionReason = "";
    req.user.isVerified = false;
    req.user.driverVerificationSubmittedAt = new Date();
    req.user.driverVerificationReviewedBy = null;
    req.user.driverVerificationReviewedAt = null;
    await req.user.save();
    await markDocumentsPending(req.user._id);
    return res.json({ status: req.user.driverVerificationStatus, message: "Driver application submitted for review" });
  } catch (error) {
    return next(error);
  }
});

router.get("/application/documents/:documentId", async (req, res, next) => {
  try {
    const document = await DriverDocument.findOne({ _id: req.params.documentId, driver: req.user._id }).select("+fileData");
    if (!document?.fileData) return res.status(404).json({ message: "Document not found" });
    res.set({
      "Content-Type": document.contentType,
      "Content-Disposition": "attachment; filename=driver-document",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(document.fileData);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;