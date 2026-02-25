import {useState} from "react";
import { login } from "../api/entryApi.js";
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
        if (response.newUser) {
            alert(`No account existing for "${username}" as ${role}. A new one was created.`);
        }

        localStorage.setItem("token", response.token);
        localStorage.setItem("username", username);
        localStorage.setItem("role", response.role || role);
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
            onSubmit={handleSubmit}
            primaryLabel="School Login"
            secondaryLabel="Admin Login"
        />
    );
}