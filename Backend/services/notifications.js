const Notification = require("../model/Notification");

async function createNotifications(entries) {
  if (!entries.length) return;
  try {
    await Promise.all(entries.map(({ recipient, ...notification }) => Notification.updateOne(
      { recipient, dedupeKey: notification.dedupeKey },
      { $setOnInsert: { recipient, ...notification } },
      { upsert: true }
    )));
  } catch (error) {
    console.error("Notification persistence failed:", error.name || "Error");
  }
}

module.exports = { createNotifications };