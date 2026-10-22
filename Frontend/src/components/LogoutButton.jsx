import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LogoutButton() {
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
			<button onClick={handleLogout} className="min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-plumMuted hover:bg-plumCard hover:text-plumText transition">
				<LogOut size={18} />Logout
			</button>
			{error && <p role="alert" className="text-xs text-coral px-3 mt-2">{error}</p>}
		</>
	);
}
