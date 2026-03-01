export default function AppHeader({ username, onLogout }) {
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container-fluid px-3">
                <span className="navbar-brand m-0">
                    <strong>Osprey Benchmarking</strong>
                </span>

                <div className="ms-auto d-flex align-items-center gap-3">
                    <span className="navbar-text text-white">
                        Hello, <strong>{username}</strong>
                    </span>
                    {role === "school" && schoolName && <p>School: {schoolName}</p>}

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
