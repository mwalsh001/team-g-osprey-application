import AppHeader from "../components/AppHeader.jsx";
import Sidebar from "../components/SideBar.jsx";
import { useEffect, useState } from "react";
import { getSchools, getSchoolYears } from "../api/annualBenchmarkingApi.js";

import EnrollmentOverTimeChart from "../components/KpiGraphs/EnrollmentOverTime.jsx";
import EnrollmentByGenderChart from "../components/KpiGraphs/EnrollmentByGender.jsx";
import RetentionYOYChart from "../components/KpiGraphs/Retention.jsx";
import AttritionYOYChart from "../components/KpiGraphs/Attrition.jsx";
import CombinedYOYChart from "../components/KpiGraphs/CombinedYoY.jsx";

export default function KpiDashboard({ username, onLogout }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [schools, setSchools] = useState([]);
    const [years, setYears] = useState([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [selectedYearId, setSelectedYearId] = useState("");
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");

    useEffect(() => {
        async function load() {
            try {
                const [s, y] = await Promise.all([getSchools(), getSchoolYears()]);
                setSchools(s);
                setYears(y);
                if (role === "school") {
                    const userSchoolName = localStorage.getItem("schoolName");
                    const userSchool = s.find((school) => String(school.name) === String(userSchoolName));
                    if (userSchool) {
                        setSelectedSchoolId(String(userSchool.id));
                    }
                } else{
                    if (s?.length && !selectedSchoolId) setSelectedSchoolId(String(s[0].id));
                }
                if (y?.length && !selectedYearId) setSelectedYearId(String(y[0].id));
            } catch (e) {
                alert("Unauthorized");
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                onLogout?.();
            }
        }
        void load();
    }, [onLogout]);

    return (
        <>
            <AppHeader username={username} onLogout={onLogout} role={role} schoolName={schoolName} />

            <div className="container-fluid">
                <div className="row">
                    <div className="col-auto p-0">
                        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
                    </div>

                    <div className="col">
                        <div className="container my-4">
                            <h2 className="mb-4">KPI Dashboard</h2>

                            <div className="row g-3 mb-4">
                                <div className="col-md-4">
                                    <label className="form-label">School</label>
                                    {role === "school" ? (
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={schools.find(s=> String(s.id) === String(selectedSchoolId))?.name}
                                            disabled />
                                    ):(
                                        <select
                                            className="form-select"
                                            value={selectedSchoolId}
                                            onChange={(e) => setSelectedSchoolId(e.target.value)}
                                        >
                                            {schools.map((s) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.name} (ID: {s.id})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">School Year</label>
                                    <select
                                        className="form-select"
                                        value={selectedYearId}
                                        onChange={(e) => setSelectedYearId(e.target.value)}
                                    >
                                        {years.map((y) => (
                                            <option key={y.id} value={String(y.id)}>
                                                {y.year ?? y.id} (ID: {y.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            <div className="card text-center">
                                <div className="card-header">
                                    <ul className="nav nav-pills card-header-pills">
                                        <li className="nav-item">
                                            <a className="nav-link active" href="#">My School</a>
                                        </li>
                                        <li className="nav-item">
                                            <a className="nav-link" href="#">Compare Schools</a>
                                        </li>
                                    </ul>
                                </div>
                                    <div className="card-body">
                                        <h5 className="card-title mb-3">Enrollment Statistics</h5>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <EnrollmentOverTimeChart
                                                    schools={schools}
                                                    selectedSchoolId={selectedSchoolId}
                                                    canvasId="enrollmentRate"
                                                />
                                            </div>

                                            <div className="col-md-6">
                                                <EnrollmentByGenderChart
                                                    schools={schools}
                                                    years={years}
                                                    selectedSchoolId={selectedSchoolId}
                                                    selectedYearId={selectedYearId}
                                                    canvasId="enrollmentByGender"
                                                />
                                            </div>
                                        </div>
                                </div>

                            </div>

                            <div className="card text-center">
                                <div className="card-body">
                                    <h5 className="card-title mb-3">Attrition Statistics</h5>

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <CombinedYOYChart selectedSchoolId={selectedSchoolId} canvasId="combinedYOY" />
                                        </div>

                                        <div className="col-md-6">
                                            <RetentionYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="retentionYOY"/>
                                            <AttritionYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="attritionYOY"/>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/*    <CombinedYOYChart selectedSchoolId={selectedSchoolId} canvasId="combinedYOY" />*/}
                            {/*    <InquiriesYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="inquiriesYOY"/>*/}
                            {/*    <InquiriesByGenderChart selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="inquiriesByGender"/>*/}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
