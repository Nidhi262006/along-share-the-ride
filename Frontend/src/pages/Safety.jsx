import { useEffect, useState } from "react";
import { LifeBuoy, Phone, Plus, Trash2 } from "lucide-react";

const CONTACTS_KEY = "routemate-emergency-contacts";
const MAX_CONTACTS = 3;

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Safety() {
  const [contacts, setContacts] = useState(loadContacts);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const addContact = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Enter a name and phone number");
      return;
    }
    if (contacts.length >= MAX_CONTACTS) {
      setError(`You can add up to ${MAX_CONTACTS} contacts`);
      return;
    }
    setContacts([...contacts, { name: name.trim(), phone: phone.trim() }]);
    setName("");
    setPhone("");
    setError("");
  };

  const removeContact = (phone) => setContacts(contacts.filter((c) => c.phone !== phone));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-1">Safety</h1>
      <p className="text-sm text-inkMuted mb-6">Manage who gets notified when you use the SOS button</p>

      <div className="bg-white border border-cardBorder rounded-2xl p-5 sm:p-6 mb-6 flex items-start gap-3">
        <LifeBuoy size={20} className="text-coral shrink-0 mt-0.5" />
        <p className="text-sm text-inkMuted leading-relaxed">
          Press the SOS button on any screen and hold for 3 seconds to alert your emergency contacts with your live location. You can cancel any time before the countdown ends.
        </p>
      </div>

      <form onSubmit={addContact} className="bg-white border border-cardBorder rounded-2xl p-5 sm:p-6 mb-4">
        <p className="text-sm font-medium text-ink mb-3">Add emergency contact</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" className="flex-1 border border-cardBorder rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="flex-1 border border-cardBorder rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose" />
          <button type="submit" className="bg-rose text-plumText rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 shrink-0">
            <Plus size={16} /> Add
          </button>
        </div>
        {error && <p className="text-xs text-coral mt-2">{error}</p>}
      </form>

      <div className="space-y-2">
        {contacts.length === 0 && (
          <div className="text-center py-10 bg-white border border-cardBorder rounded-2xl text-sm text-inkMuted">
            No emergency contacts yet
          </div>
        )}
        {contacts.map((c) => (
          <div key={c.phone} className="bg-white border border-cardBorder rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center shrink-0">
              <Phone size={16} className="text-rose" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{c.name}</p>
              <p className="text-xs text-inkMuted">{c.phone}</p>
            </div>
            <button onClick={() => removeContact(c.phone)} className="w-9 h-9 rounded-lg border border-cardBorder flex items-center justify-center text-inkMuted hover:text-coral shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}