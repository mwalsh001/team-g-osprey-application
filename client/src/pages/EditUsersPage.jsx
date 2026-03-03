import AppHeader from "../components/AppHeader.jsx";
import Sidebar from "../components/SideBar.jsx";
import {useState} from "react";
import {createSchoolAccount} from "../api/loginApi";

export default function EditUsersPage ({ username, onLogout }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");
    const isAdmin = role === "admin";
    const [notify, setNotify] = useState("");
    const [schoolUsername, setSchoolUsername] = useState("");
    const [schoolPassword, setSchoolPassword] = useState("");
    const [newSchoolName, setNewSchoolName] = useState("");

    const handleCreateSchoolUser = async (entry) => {
        entry.preventDefault();
        try {
            await createSchoolAccount(schoolUsername, schoolPassword, newSchoolName);
            setNotify(`School account "${schoolUsername}" from "${newSchoolName}" created successfully`);
            setSchoolUsername("");
            setSchoolPassword("");
            setNewSchoolName("");
        } catch (e) {
            setNotify("Failed to create the school account");
        }
    };

    return (
        <>
            <AppHeader username={username} onLogout={onLogout} role={role} schoolName={schoolName}/>
            <div className="container-fluid p-0">
                <div className="d-flex" style={{minHeight: "100vh"}}>
                    <div style={{flex: "0 0 auto"}}>
                        <Sidebar
                            collapsed={sidebarCollapsed}
                            onToggle={() => setSidebarCollapsed((v) => !v)}
                        />
                    </div>

                    <main className="flex-grow-1" style={{minWidth: 0}}>
                        <div className="container my-4">
                            <h2 className="mb-4">Edit Users</h2>

                            {notify && <div className="alert alert-info py-2">{notify}</div>}

                            {isAdmin ? (
                                <form onSubmit={handleCreateSchoolUser} className="card">
                                    <div className="card-body d-flex flex-column gap-3">
                                        <h5 className="card-title mb-0">Create New School User</h5>

                                        <div>
                                            <label className="form-label">Username</label>
                                            <input
                                                className="form-control"
                                                value={schoolUsername}
                                                onChange={(entry) => setSchoolUsername(entry.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label">Password</label>
                                            <input
                                                className="form-control"
                                                type="password"
                                                value={schoolPassword}
                                                onChange={(entry) => setSchoolPassword(entry.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label">School Name</label>
                                            <input
                                                className="form-control"
                                                value={newSchoolName}
                                                onChange={(entry) => setNewSchoolName(entry.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <button type="submit" className="btn btn-primary">
                                                Create School User
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                ) : (
                                    <div className="alert alert-warning">Unauthorized.</div>
                            )}

                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
