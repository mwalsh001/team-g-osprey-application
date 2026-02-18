export default function AppHeader({ username, onLogout }) {
    return (
        <header>
            <h1>Hello, {username}!</h1>
            <button type="button" onClick={onLogout}>
                Logout
            </button>
        </header>
    );
}
