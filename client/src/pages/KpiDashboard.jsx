import AppHeader from "../components/AppHeader.jsx";
import Sidebar from "../components/SideBar.jsx";
import { useEffect, useState } from "react";
import {getSchoolRegions, getSchools, getSchoolYears} from "../api/annualBenchmarkingApi.js";

import EnrollmentOverTimeChart from "../components/KpiGraphs/EnrollmentOverTime.jsx";
import EnrollmentByGenderChart from "../components/KpiGraphs/EnrollmentByGender.jsx";
import RetentionYOYChart from "../components/KpiGraphs/Retention.jsx";
import AttritionYOYChart from "../components/KpiGraphs/Attrition.jsx";
import CombinedYOYChart from "../components/KpiGraphs/CombinedYoY.jsx";
import FilterEnrollmentOverTimeChart from "../components/KpiGraphs/FilterEnrollmentOverTime.jsx";

export default function KpiDashboard({ username, onLogout }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [schools, setSchools] = useState([]);
    const [years, setYears] = useState([]);
    const [regions, setRegions] = useState([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState("");
    const [selectedYearId, setSelectedYearId] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [activeTab, setActiveTab] = useState("mySchool");
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");

    useEffect(() => {
        async function load() {
            try {
                const [s, y, r] = await Promise.all([getSchools(), getSchoolYears(), getSchoolRegions()]);
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
                setRegions(r);
                if (s?.length && !selectedSchoolId) setSelectedSchoolId(String(s[0].id));
                if (y?.length && !selectedYearId) setSelectedYearId(String(y[0].id));
                if (r?.length && !selectedRegion) setSelectedRegion(String(r[0]));
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

                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <div className="btn-group flex-wrap">
                                    <button
                                        type="button"
                                        className={`btn ${activeTab === "mySchool" ? "btn-primary" : "btn-outline-primary"}`}
                                        onClick={() => setActiveTab("mySchool")}
                                    >
                                        My School
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${activeTab === "compareSchools" ? "btn-primary" : "btn-outline-primary"}`}
                                        onClick={() => setActiveTab("compareSchools")}
                                    >
                                        Compare Schools
                                    </button>
                                </div>
                            </div>

                            <div className="card text-center">
                                <div className="card-header">
                                    <div className="row g-3">
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
                                                            {s.name}
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
                                                        {y.year ?? y.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {activeTab === "compareSchools" && (
                                            <div className="col-md-4">
                                                <label className="form-label">School Region</label>
                                                <select
                                                    className="form-select"
                                                    value={selectedRegion}
                                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                                >
                                                    {regions.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="card-body">
                                    {activeTab === "mySchool" && (
                                        <>
                                            <h5 className="card-title mb-3 text-start border-start border-3 border-primary ps-3">
                                                Enrollment Statistics
                                            </h5>

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
                                        </>
                                    )}

                                    {activeTab === "compareSchools" && (
                                        <>
                                            <h5 className="card-title mb-3 text-start border-start border-3 border-primary ps-3">
                                                Enrollment Statistics
                                            </h5>

                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <FilterEnrollmentOverTimeChart
                                                        schools={schools}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedRegion={selectedRegion}
                                                        canvasId="compareFilterEnrollmentRate"
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <EnrollmentByGenderChart
                                                        schools={schools}
                                                        years={years}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedYearId={selectedYearId}
                                                        canvasId="compareEnrollmentByGender"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                            </div>

                            <div className="card text-center">
                                <div className="card-body">
                                    {activeTab === "mySchool" && (
                                        <>
                                            <h5 className="card-title mb-3 text-start border-start border-3 border-primary ps-3">
                                                Attrition Statistics
                                            </h5>

                                            <div className="row g-3 justify-content-center align-items-start">
                                                <div className="col-md-6 col-lg-6">
                                                    <RetentionYOYChart
                                                        schools={schools}
                                                        years={years}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedYearId={selectedYearId}
                                                        canvasId="retentionYOY"
                                                    />
                                                    <CombinedYOYChart selectedSchoolId={selectedSchoolId} canvasId="combinedYOY" />
                                                </div>
                                                <div className="col-md-6 col-lg-6">
                                                    <AttritionYOYChart
                                                        schools={schools}
                                                        years={years}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedYearId={selectedYearId}
                                                        canvasId="attritionYOY"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === "compareSchools" && (
                                        <>
                                            <h5 className="card-title mb-3 text-start border-start border-3 border-primary ps-3">
                                                Attrition Statistics
                                            </h5>

                                            <div className="row g-3 justify-content-center align-items-start">
                                                <div className="col-md-6 col-lg-6">
                                                    <RetentionYOYChart
                                                        schools={schools}
                                                        years={years}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedYearId={selectedYearId}
                                                        canvasId="compareRetentionYOY"
                                                    />
                                                    <CombinedYOYChart selectedSchoolId={selectedSchoolId} canvasId="compareCombinedYOY" />
                                                </div>
                                                <div className="col-md-6 col-lg-6">
                                                    <AttritionYOYChart
                                                        schools={schools}
                                                        years={years}
                                                        selectedSchoolId={selectedSchoolId}
                                                        selectedYearId={selectedYearId}
                                                        canvasId="compareAttritionYOY"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
