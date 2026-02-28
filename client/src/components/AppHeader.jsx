export default function AppHeader({ username, onLogout }) {
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");
    return (
        <header>
            <h1>Hello, {username}!</h1>
            {role === "school" && schoolName && <p>School: {schoolName}</p>}
            <button type="button" onClick={onLogout}>
                Logout
            </button>
        </header>
    );
}
