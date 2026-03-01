import {useState} from "react";
import { login } from "../api/loginApi.js";
import LoginForm from "../components/LoginForm.jsx";

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    async function handleSubmit(role) {
        setError(null);

        const response = await login(username, password, role);
        if (!response.success) {
            setError("Incorrect username, password, or role.");
            return;
        }
        localStorage.setItem("token", response.token);
        localStorage.setItem("username", username);
        localStorage.setItem("role", response.role || role)
        localStorage.setItem("schoolName", response.schoolName || "");
        onLogin(username);
    }

    return (
        <LoginForm
            title={"Osprey Login"}
            username={username}
            password={password}
            error={error}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSchoolLogin={() => void handleSubmit("school")}
            onAdminLogin={() => void handleSubmit("admin")}
            primaryLabel="School Login"
            secondaryLabel="Admin Login"
        />
    );
}
