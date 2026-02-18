import {useState} from 'react'
import LoginPage from "./pages/LoginPage.jsx";
import EntryManagerPage from "./pages/EntryManagerPage.jsx";

function App() {
    const [username, setUsername] = useState(() => localStorage.getItem("username"));

    function handleLogin(username) {
        localStorage.setItem("username", username);
        setUsername(username);
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        setUsername(null);
    }

    if (!username) {
        return <LoginPage onLogin={handleLogin}/>
    }

    return (
        <EntryManagerPage username={username} onLogout={handleLogout}/>
    )
}

export default App