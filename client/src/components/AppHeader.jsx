export default function AppHeader({ username, onLogout }) {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container">
                <span className="navbar-brand">
                    <strong>Osprey Benchmarking</strong>
                </span>

                <div className="d-flex align-items-center gap-3">
                    <span className="navbar-text text-white">
                        Hello, <strong>{username}</strong>
                    </span>

                    <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={onLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
