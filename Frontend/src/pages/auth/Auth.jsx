import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Route, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Auth() {
  const navigate = useNavigate();
  const { authenticate } = useAuth();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const authenticatedUser = await authenticate(mode, form);
      navigate(authenticatedUser.role === "admin" ? "/admin" : authenticatedUser.role === "driver" ? "/driver" : "/passenger");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#17121f] text-white overflow-hidden relative">
      <div className="absolute -top-40 -left-32 w-96 h-96 rounded-full bg-[#764369]/30 blur-3xl" />
      <div className="absolute -bottom-48 -right-20 w-[34rem] h-[34rem] rounded-full bg-[#5f3a56]/30 blur-3xl" />

      <div className="relative min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-[#241b2e] via-[#332741] to-[#5f3a56]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Route size={24} />
              </div>
              <span className="font-heading text-2xl font-semibold">along.</span>
            </div>
            <div className="max-w-lg mt-28">
              <p className="uppercase tracking-[0.22em] text-xs text-[#cbbfd3]">Along</p>
              <h1 className="font-heading text-5xl xl:text-6xl font-semibold leading-tight mt-4">
                Your commute, not your cost.
              </h1>
              <p className="text-[#d0c5d7] mt-6 max-w-md leading-7">
                Find a ride, book a seat, or share your upcoming route with other students.
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-sm text-[#d0c5d7]">
            <span className="px-4 py-2 rounded-full bg-white/10">Verified riders</span>
            <span className="px-4 py-2 rounded-full bg-white/10">Easy booking</span>
            <span className="px-4 py-2 rounded-full bg-white/10">Student rides</span>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2 mb-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Route size={21} /></div>
              <span className="font-heading text-xl font-semibold">along.</span>
            </div>

            <div className="mb-8">
              <p className="text-[#a99bb1] text-sm">Welcome back</p>
              <h2 className="font-heading text-3xl font-semibold mt-2">{mode === "login" ? "Sign in to along." : "Create your account"}</h2>
              <p className="text-[#a99bb1] text-sm mt-2">{mode === "login" ? "Sign in to find and manage rides." : "Create an account to find or offer rides."}</p>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 mb-6">
              {["login", "signup"].map((item) => (
                <button key={item} onClick={() => { setMode(item); setError(""); }} className={`py-2.5 rounded-lg text-sm font-medium capitalize transition ${mode === item ? "bg-white text-[#241b2e]" : "text-[#bdb1c5]"}`}>
                  {item}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="text-xs text-[#bdb1c5]">Full name</span>
                  <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-white/30">
                    <UserRound size={17} className="text-[#a99bb1]" />
                    <input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-transparent outline-none w-full text-sm" placeholder="Your name" />
                  </div>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-[#bdb1c5]">Email address</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-white/30">
                  <Mail size={17} className="text-[#a99bb1]" />
                  <input required maxLength={254} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-transparent outline-none w-full text-sm" placeholder="you@example.com" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-[#bdb1c5]">Password</span>
                <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus-within:border-white/30">
                  <LockKeyhole size={17} className="text-[#a99bb1]" />
                  <input required minLength={mode === "signup" ? 8 : undefined} maxLength={128} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-transparent outline-none w-full text-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#a99bb1] hover:text-white">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </label>

              {mode === "login" && <div className="flex justify-end"><button type="button" className="text-xs text-[#d2bdd4] hover:text-white">Forgot password?</button></div>}

              {error && <p role="alert" className="text-sm text-red-300" aria-live="polite">{error}</p>}

              <button disabled={pending} className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-white text-[#241b2e] py-3.5 text-sm font-semibold hover:bg-[#eee7f0] transition disabled:opacity-60">
                {pending ? "Please wait..." : mode === "login" ? "Login" : "Create account"}<ArrowRight size={17} />
              </button>
            </form>

            <p className="text-center text-xs text-[#8f8198] mt-7">By continuing, you agree to along&apos;s Terms and Privacy Policy.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
