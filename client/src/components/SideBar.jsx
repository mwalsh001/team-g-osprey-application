import { NavLink } from "react-router-dom";

export default function Sidebar({ collapsed, onToggle }) {
    const width = collapsed ? "72px" : "200px";
    const userRole = localStorage.getItem("role");
    const isAdmin = userRole === "admin";

    return (
        <aside
            className="d-flex flex-column flex-shrink-0 border-end bg-light"
            style={{
                width,
                height: "100vh",
                position: "sticky",
                top: 0,
                transition: "width 180ms ease",
                overflowX: "hidden",
            }}
        >
            <div className="d-flex align-items-center justify-content-between p-3">
                {!collapsed && <span className="fs-5 fw-semibold">Menu</span>}

                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={onToggle}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    <span style={{fontSize: "1.1rem", lineHeight: 1}}>☰</span>
                </button>
            </div>

            <hr className="my-0"/>

            <ul className="nav nav-pills flex-column p-2 gap-1">
                <li className="nav-item">
                    <NavLink
                        to="/"
                        className={({isActive}) =>
                            `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`
                        }
                        title="Entry"
                    >
                        <span aria-hidden="true">+</span>
                        {!collapsed && <span>Data Entry</span>}
                    </NavLink>
                </li>

                <li className="nav-item">
                    <NavLink
                        to="/dashboard"
                        className={({isActive}) =>
                            `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`
                        }
                        title="Dashboard"
                    >
                        <span aria-hidden="true">+</span>
                        {!collapsed && <span>KPI Dashboard</span>}
                    </NavLink>
                </li>

                {isAdmin && (<li className="nav-item">
                    <NavLink
                        to="/editUser"
                        className={({isActive}) =>
                            `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`
                        }
                        title="Edit Users"
                    >
                        <span aria-hidden="true">+</span>
                        {!collapsed && <span>Edit Users</span>}
                    </NavLink>
                </li>)}
            </ul>
        </aside>
    );
}

