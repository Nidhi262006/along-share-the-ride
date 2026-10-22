import { useState } from "react";
import { Star, X } from "lucide-react";

const TAG_OPTIONS = ["Safe driving", "On time", "Friendly", "Clean car", "Good music"];

export default function RatingModal({ ride, onClose, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = () => {
    if (stars === 0) {
      setError("Pick a star rating first");
      return;
    }
    onSubmit({ stars, tags, comment: comment.trim(), submittedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-ink">Rate {ride.driver}</p>
            <p className="text-xs text-inkMuted mt-0.5">{ride.route} · {ride.date}</p>
          </div>
          <button onClick={onClose} className="text-inkMuted shrink-0"><X size={18} /></button>
        </div>

        <p className="text-sm font-medium text-ink mb-2">How was the ride?</p>
        <div className="flex gap-1 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => { setStars(n); setError(""); }}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-1"
            >
              <Star size={28} className={n <= stars ? "fill-gold text-gold" : "text-cardBorder"} />
            </button>
          ))}
        </div>

        <p className="text-sm font-medium text-ink mb-2">What went well?</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                tags.includes(tag) ? "bg-sage/15 text-sage border-sage/30" : "border-cardBorder text-inkMuted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Add a comment (optional)"
          className="w-full border border-cardBorder rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose resize-none"
        />
        {error && <p className="text-xs text-coral mt-2">{error}</p>}

        <button onClick={submit} className="w-full mt-5 bg-rose text-plumText rounded-xl py-3 text-sm font-medium">
          Submit review
        </button>
      </div>
    </div>
  );
}