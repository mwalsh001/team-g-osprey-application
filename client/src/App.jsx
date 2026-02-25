import {useState} from 'react'
import LoginPage from "./pages/LoginPage.jsx";
import EntryManagerPage from "./pages/EntryManagerPage.jsx";

function App() {
    const [username, setUsername] = useState(() => localStorage.getItem("username"));
//read username
    function handleLogin(username) {
        localStorage.setItem("username", username);
        setUsername(username);
    }
//^^stores username/updates it
    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        setUsername(null);
    }
//if no username, render loginpage again
    if (!username) {
        return <LoginPage onLogin={handleLogin}/>
    }

    return (
        <EntryManagerPage username={username} onLogout={handleLogout}/>
    )
}

export default App