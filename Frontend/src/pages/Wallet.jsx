import { Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { transactions } from "../data/mockData.js";

export default function Wallet() {
  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-6">Wallet</h1>

      <div className="bg-plum text-plumText rounded-xl p-5 mb-6">
        <p className="text-xs text-plumMuted">Available balance</p>
        <div className="flex items-center justify-between mt-1">
          <p className="font-heading text-3xl font-semibold">₹2,450</p>
          <button className="flex items-center gap-1.5 bg-rose text-plumText text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-roseBright transition-colors">
            <Plus size={14} /> Add money
          </button>
        </div>
      </div>

      <h2 className="text-sm text-inkMuted mb-3">Recent transactions</h2>
      <div className="flex flex-col gap-2">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between bg-card border border-cardBorder rounded-xl px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  t.amount < 0 ? "bg-cream" : "bg-sage/15"
                }`}
              >
                {t.amount < 0 ? (
                  <ArrowUpRight size={16} className="text-inkMuted" />
                ) : (
                  <ArrowDownLeft size={16} className="text-sage" />
                )}
              </div>
              <div>
                <p className="text-sm text-ink">{t.title}</p>
                <p className="text-xs text-inkMuted mt-0.5">
                  {t.to ? `${t.to} · ` : ""}
                  {t.date}
                </p>
              </div>
            </div>
            <p
              className={`text-sm font-medium ${
                t.amount < 0 ? "text-ink" : "text-sage"
              }`}
            >
              {t.amount < 0 ? "-" : "+"}₹{Math.abs(t.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
