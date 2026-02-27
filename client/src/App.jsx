import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import EntryManagerPage from "./pages/EntryManagerPage.jsx";
import KpiDashboard from "./pages/KpiDashboard.jsx";

export default function App() {
    const [username, setUsername] = useState(() => localStorage.getItem("username"));

    function handleLogin(username) {
        // IMPORTANT: Login flow should also set localStorage.setItem("token", token)
        localStorage.setItem("username", username);
        setUsername(username);
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        setUsername(null);
    }

    const token = localStorage.getItem("token");

    if (!username || !token) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <Routes>
            <Route
                path="/"
                element={<EntryManagerPage username={username} onLogout={handleLogout} />}
            />

            <Route
                path="/dashboard"
                element={<KpiDashboard username={username} onLogout={handleLogout} />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}