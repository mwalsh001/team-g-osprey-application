export default function AppHeader({ username, onLogout, schoolName }) {
    const userRole = localStorage.getItem("role");
    const userSchoolName = schoolName || localStorage.getItem("schoolName");
    const isAdmin = userRole === "admin";
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container-fluid px-3">
                <span className="navbar-brand m-0">
                    <strong>Osprey Benchmarking</strong>
                </span>

                <div className="ms-auto d-flex align-items-center gap-3">
                    <span className="navbar-text text-white">
                        Hello, <strong>{username}</strong>{"! "}
                        {isAdmin ? (
                            <span>Role: Admin</span>
                        ) : (
                            <span>School: {userSchoolName}</span>
                        )}
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
