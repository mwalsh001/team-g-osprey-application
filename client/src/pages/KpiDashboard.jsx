import AppHeader from "../components/AppHeader.jsx";
import Sidebar from "../components/SideBar.jsx";
import { useEffect, useState } from "react";
import {getSchoolRegions, getSchools, getSchoolYears} from "../api/annualBenchmarkingApi.js";

import EnrollmentOverTimeChart from "../components/KpiGraphs/EnrollmentOverTime.jsx";
import EnrollmentByGenderChart from "../components/KpiGraphs/EnrollmentByGender.jsx";
import RetentionYOYChart from "../components/KpiGraphs/Retention.jsx";
import AttritionYOYChart from "../components/KpiGraphs/Attrition.jsx";
import InquiriesYOYChart from "../components/KpiGraphs/Inquiries.jsx";
import InquiriesByGenderChart from "../components/KpiGraphs/InquiriesByGender.jsx";
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
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");

    useEffect(() => {
        async function load() {
            try {
                const [s, y, r] = await Promise.all([getSchools(), getSchoolYears(), getSchoolRegions()]);
                setSchools(s);
                setYears(y);
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

                            <div className="row g-3 mb-4">
                                <div className="col-md-4">
                                    <label className="form-label">School</label>
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
                            </div>
                            <div className="row g-4">
                                <EnrollmentOverTimeChart schools={schools} selectedSchoolId={selectedSchoolId} canvasId="enrollmentRate"/>
                                {/*<FilterEnrollmentOverTimeChart schools={schools} selectedSchoolId={selectedSchoolId} regions={regions} canvasId={"filterEnrollmentRate"}/>*/}
                                <EnrollmentByGenderChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="enrollmentByGender"/>
                                <RetentionYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="retentionYOY"/>
                                <AttritionYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="attritionYOY"/>
                                <CombinedYOYChart selectedSchoolId={selectedSchoolId} canvasId="combinedYOY" />
                                <InquiriesYOYChart schools={schools} years={years} selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="inquiriesYOY"/>
                                <InquiriesByGenderChart selectedSchoolId={selectedSchoolId} selectedYearId={selectedYearId} canvasId="inquiriesByGender"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
