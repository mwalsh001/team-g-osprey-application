import { NavLink } from "react-router-dom";

export default function Sidebar({ collapsed, onToggle }) {
    const width = collapsed ? "72px" : "240px";

    return (
        <aside
            className="d-flex flex-column flex-shrink-0 border-end bg-light"
            style={{
                width,
                minHeight: "100vh",
                transition: "width 180ms ease",
                overflowX: "hidden",
            }}
        >
            <div className="d-flex align-items-center justify-content-between p-3">
                {!collapsed && <span className="fs-5 fw-semibold">Dashboard</span>}

                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={onToggle}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>☰</span>
                </button>
            </div>

            <hr className="my-0" />

            <ul className="nav nav-pills flex-column p-2 gap-1">
                <li className="nav-item">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`
                        }
                        title="Entry"
                    >
                        <span aria-hidden="true">+</span>
                        {!collapsed && <span>Entry</span>}
                    </NavLink>
                </li>

                <li className="nav-item">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`
                        }
                        title="Dashboard"
                    >
                        <span aria-hidden="true">+</span>
                        {!collapsed && <span>Dashboard</span>}
                    </NavLink>
                </li>
            </ul>

            <div className="mt-auto p-2 small text-muted">
                {!collapsed && <span>v1.0</span>}
            </div>
        </aside>
    );
}