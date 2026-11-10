import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LogoutButton({ tone = "dark" }) {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const [error, setError] = useState("");

	const handleLogout = async () => {
		setError("");
		try {
			await logout();
			navigate("/auth", { replace: true });
		} catch {
			setError("Unable to sign out. Check your connection and try again.");
		}
	};

	return (
		<>
			<button onClick={handleLogout} className={tone === "light" ? "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#5c5468] hover:bg-[#f4f0f8]" : "min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-plumMuted hover:bg-plumCard hover:text-plumText transition"}>
				<LogOut size={18} />Logout
			</button>
			{error && <p role="alert" className="text-xs text-coral px-3 mt-2">{error}</p>}
		</>
	);
}
