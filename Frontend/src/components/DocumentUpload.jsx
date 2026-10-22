import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";

export default function DocumentUpload({ label, hint, file, onSelect, onRemove, accept = "image/*,.pdf" }) {
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const picked = fileList?.[0];
    if (!picked) return;
    onSelect(picked);
  };

  return (
    <div className="bg-white border border-cardBorder rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-inkMuted mt-1">{hint}</p>
        </div>
        {file && (
          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gold/15 text-gold">
            Pending review
          </span>
        )}
      </div>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full mt-4 border-2 border-dashed border-cardBorder rounded-xl py-6 sm:py-8 flex flex-col items-center justify-center gap-2 text-inkMuted hover:border-rose hover:text-rose transition"
        >
          <Upload size={20} />
          <span className="text-xs font-medium">Tap to upload</span>
          <span className="text-[11px]">JPG, PNG or PDF, up to 5MB</span>
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3 border border-cardBorder rounded-xl p-3">
          {file.previewUrl ? (
            <img src={file.previewUrl} alt={file.name || file.originalName} className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-cream flex items-center justify-center shrink-0">
              <FileText size={20} className="text-rose" />
            </div>
          )}
          <p className="flex-1 min-w-0 text-xs text-ink truncate">{file.name || file.originalName}</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-rose font-medium shrink-0">
            Replace
          </button>
          {onRemove && <button type="button" onClick={onRemove} className="w-8 h-8 rounded-lg border border-cardBorder flex items-center justify-center text-inkMuted hover:text-coral shrink-0">
            <X size={14} />
          </button>}
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={(e) => handleFiles(e.target.files)} className="hidden" />
    </div>
  );
}