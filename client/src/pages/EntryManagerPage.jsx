import { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader.jsx";
import Sidebar from "../components/SideBar.jsx";

import {
    addAAE,
    addAttrition,
    addAttritionSoc,
    deleteAAE,
    editAAE,
    editAttrition,
    editAttritionSoc,
    getAAE,
    getAttrition,
    getAttritionSoc,
    getGrades,
    getSchools,
    getSchoolYears
} from "../api/annualBenchmarkingApi.js";

function AAESection({ aaeGrid, setAaeGrid, saveAAESection }) {
    return (
        <div>
            <h3 style={{marginTop: 0}}>Admissions: Enrollment</h3>
            <p style={{marginTop: 0, opacity: 0.85}}>
                Enter the number enrolled for each Enrollment Type and Gender. Leave blank to remove that row.
            </p>

            <div style={{overflowX: "auto"}}>
                <table className="table table-bordered table-sm align-middle">
                    <thead>
                    <tr>
                        <th>ENROLLMENT_TYPE_CD</th>
                        {["M", "F", "NB", "U"].map((g) => {
                            let tooltipText;
                            switch (g) {
                                case "M":
                                    tooltipText = "Male students";
                                    break;
                                case "F":
                                    tooltipText = "Female students";
                                    break;
                                case "NB":
                                    tooltipText = "Non-binary students";
                                    break;
                                case "U":
                                    tooltipText = "All students";
                                    break;
                                default:
                                    tooltipText = "";
                            }
                            return (
                                <th key={g}>
                                    {g} {" "}
                                    <span title={tooltipText} style={{ cursor: "pointer"}}>
                                        &#x2139;
                                    </span>
                                </th>
                            );
                        })}
                    </tr>
                    </thead>
                    <tbody>
                    {["INQUIRIES", "FACULTYCHILD"].map((t) => (
                        <tr key={t}>
                            <td style={{fontWeight: 600}}>{t}
                                <span
                                    style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                                    title={
                                        t === "INQUIRIES"
                                            ? "Number of students who made inquiries in the previous school year"
                                            : "Number of students who are children of faculty/staff"
                                    }
                                >
                                    &#x2139;
                                </span>
                            </td>

                            {["M", "F", "NB", "U"].map((g) => {
                                return (
                                    <td key={g}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={aaeGrid[t][g] ?? ""}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                if (next === "" || /^\d+$/.test(next)) {
                                                    setAaeGrid((prev) => ({
                                                        ...prev,
                                                        [t]: {...prev[t], [g]: next},
                                                    }));
                                                }
                                            }}
                                            placeholder="(blank = none)"
                                            style={{
                                                width: "120px",
                                            }}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={saveAAESection}
                >
                    Submit Section
                </button>
            </div>
        </div>
    );
}

function AttritionForm({ title, form, setForm, onSave }) {
    const field = (name, label, tooltip) => {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600 }}>
                    {label}
                    {tooltip && (
                        <span style={{marginLeft: "0.25rem", cursor: "pointer" }} title={tooltip}> &#x2139; </span>
                    )}
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={form[name] ?? ""}
                    onChange={(e) => {
                        const next = e.target.value;
                        if (next === "" || /^\d+$/.test(next)) {
                            setForm((prev) => ({ ...prev, [name]: next }));
                        }
                    }}
                    style={{ width: "240px", border: "1px solid #ccc" }}
                />
            </div>
        );
    };

    return (
        <div>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {field("STUDENTS_ADDED_DURING_YEAR", "Students added during year", "Number of students who enrolled during the school year")}
                {field("STUDENTS_GRADUATED", "Students graduated", "Number of students who graduated from Grade 12 this year (Only relevant for Grade 12 reports)")}
                {field("EXCH_STUD_REPTS", "Exchange student reports", "Number of exchange students reported this year")}
                {field("STUD_DISS_WTHD", "Dismissed / withdrew", "Number of students who withdrew or were dismissed during this year")}
                {field("STUD_NOT_INV", "Not invited", "Number of students not invited to return next year")}
                {field("STUD_NOT_RETURN", "Not returning", "Number of students who did not return by choice")}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button type="button"
                        className="btn btn-success"
                        onClick={onSave}
                >
                    Submit Section
                </button>
            </div>
        </div>
    );
}

// Helpers
export default function AnnualFormPage({ username, onLogout }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [schools, setSchools] = useState([]);
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);

    const [schoolId, setSchoolId] = useState("");
    const [schoolYearId, setSchoolYearId] = useState("");
    const [gradeId, setGradeId] = useState("");

    const [section, setSection] = useState("AAE");

    const [aaeRows, setAaeRows] = useState([]);
    const [attrRows, setAttrRows] = useState([]);
    const [attrSocRows, setAttrSocRows] = useState([]);

    const [aaeGrid, setAaeGrid] = useState(() => {
        const g = {};
        for (const t of ["INQUIRIES", "FACULTYCHILD"]) {
            g[t] = {};
            for (const gen of ["M", "F", "NB", "U"]) g[t][gen] = "";
        }
        return g;
    });

    const [attrForm, setAttrForm] = useState({
        STUDENTS_ADDED_DURING_YEAR: "",
        STUDENTS_GRADUATED: "",
        EXCH_STUD_REPTS: "",
        STUD_DISS_WTHD: "",
        STUD_NOT_INV: "",
        STUD_NOT_RETURN: "",
    });

    const [attrSocForm, setAttrSocForm] = useState({
        STUDENTS_ADDED_DURING_YEAR: "",
        STUDENTS_GRADUATED: "",
        EXCH_STUD_REPTS: "",
        STUD_DISS_WTHD: "",
        STUD_NOT_INV: "",
        STUD_NOT_RETURN: "",
    });
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState([
        {
            role: "assistant",
            content: "Support bot: ask about field meanings, KPI/chart interpretation, or data submission best practices."
        }
    ]);

    function getMiniReply(input) {
        const t = input.toLowerCase();

        if (t.includes("field") || t.includes("mean") || t.includes("what is")) {
            if (t.includes("inquir")) {
                return "INQUIRIES = total prospective student inquiries, grouped by gender (M, F, NB, U).";
            }
            if (t.includes("faculty")) {
                return "FACULTYCHILD = number of enrolled students who are children of faculty/staff, grouped by gender.";
            }
            if (t.includes("added")) {
                return "STUDENTS_ADDED_DURING_YEAR = students who joined after the school year started.";
            }
            if (t.includes("graduat")) {
                return "STUDENTS_GRADUATED = students who completed graduation in the selected year.";
            }
            if (t.includes("exchange")) {
                return "EXCH_STUD_REPTS = exchange student departures or reports captured for attrition.";
            }
            if (t.includes("dismiss") || t.includes("withd")) {
                return "STUD_DISS_WTHD = students dismissed or withdrawn during the year.";
            }
            if (t.includes("not invited")) {
                return "STUD_NOT_INV = students not invited to return next year.";
            }
            if (t.includes("not return")) {
                return "STUD_NOT_RETURN = students who chose not to return.";
            }
            return "Ask with a field name (for example: inquiries, faculty child, graduated, dismissed/withdrew, not invited).";
        }

        if (t.includes("kpi") || t.includes("chart") || t.includes("interpret") || t.includes("read")) {
            return "Interpretation guide: compare categories over the same school/year/grade, look for large deltas by gender, and verify that totals align with your source records before submission.";
        }

        if (t.includes("best practice") || t.includes("submission") || t.includes("submit") || t.includes("quality")) {
            return "Best practices: use one official source, enter whole numbers only, leave blank only when truly not applicable, review outliers before submit, and save section-by-section.";
        }

        return "I answer support questions- field meanings, KPI/chart interpretation, and data submission best practices";
    }

    function sendMiniChat() {
        const text = chatInput.trim();
        if (!text) return;

        const reply = getMiniReply(text);
        setChatMessages((prev) => [
            ...prev,
            {role: "user", content: text},
            {role: "assistant", content: reply}
        ]);
        setChatInput("");
    }

    const [notify, setNotify] = useState("");
    const role = localStorage.getItem("role");
    const schoolName = localStorage.getItem("schoolName");

    const selectedSchool = useMemo(
        () => schools.find((s) => String(s.id) === String(schoolId)),
        [schools, schoolId]
    );
    const selectedYear = useMemo(
        () => years.find((y) => String(y.id) === String(schoolYearId)),
        [years, schoolYearId]
    );
    const selectedGrade = useMemo(
        () => grades.find((g) => String(g.id) === String(gradeId)),
        [grades, gradeId]
    );

    // load lookups
    useEffect(() => {
        async function loadLookups() {
            try {
                const [s, y, g] = await Promise.all([getSchools(), getSchoolYears(), getGrades()]);
                setSchools(s);
                setYears(y);
                setGrades(g);

                if (role === "school"){
                    const userSchoolName = localStorage.getItem("schoolName");
                    const userSchool = s.find((school) => String(school.name) === String(userSchoolName));
                    if (userSchool) {
                        setSchoolId(String(userSchool.id));
                    }
                } else{
                    if (s?.length && !schoolId) setSchoolId(String(s[0].id));
                }
                if (y?.length && !schoolYearId) setSchoolYearId(String(y[0].id));
                if (g?.length && !gradeId) setGradeId(String(g[0].id));
            } catch (e) {
                alert("Unauthorized");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    onLogout?.();
                }, 1000);
            }
        }
        void loadLookups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // load annual data
    useEffect(() => {
        async function loadAnnualData() {
            if (!schoolId || !schoolYearId) return;

            try {
                setNotify("");

            const [aae, attr, attrSoc] = await Promise.all([
                getAAE({ schoolId, schoolYearId }),
                getAttrition({ schoolId, schoolYearId, gradeId }),
                getAttritionSoc({ schoolId, schoolYearId, gradeId }),
            ]);

                setAaeRows(aae);
                setAttrRows(attr);
                setAttrSocRows(attrSoc);

                const nextGrid = {};
                for (const t of ["INQUIRIES", "FACULTYCHILD"]) {
                    nextGrid[t] = {};
                    for (const gen of ["M", "F", "NB", "U"]) nextGrid[t][gen] = "";
                }
                for (const r of aae) {
                    const t = r.ENROLLMENT_TYPE_CD;
                    const g = r.GENDER;
                    if (nextGrid[t] && nextGrid[t][g] !== undefined) {
                        nextGrid[t][g] = String(r.NR_ENROLLED ?? "");
                    }
                }
                setAaeGrid(nextGrid);

                const firstAttr = attr?.[0];
                setAttrForm({
                    STUDENTS_ADDED_DURING_YEAR: firstAttr ? String(firstAttr.STUDENTS_ADDED_DURING_YEAR ?? "") : "",
                    STUDENTS_GRADUATED: firstAttr ? String(firstAttr.STUDENTS_GRADUATED ?? "") : "",
                    EXCH_STUD_REPTS: firstAttr ? String(firstAttr.EXCH_STUD_REPTS ?? "") : "",
                    STUD_DISS_WTHD: firstAttr ? String(firstAttr.STUD_DISS_WTHD ?? "") : "",
                    STUD_NOT_INV: firstAttr ? String(firstAttr.STUD_NOT_INV ?? "") : "",
                    STUD_NOT_RETURN: firstAttr ? String(firstAttr.STUD_NOT_RETURN ?? "") : "",
                });

                const firstAttrSoc = attrSoc?.[0];
                setAttrSocForm({
                    STUDENTS_ADDED_DURING_YEAR: firstAttrSoc ? String(firstAttrSoc.STUDENTS_ADDED_DURING_YEAR ?? "") : "",
                    STUDENTS_GRADUATED: firstAttrSoc ? String(firstAttrSoc.STUDENTS_GRADUATED ?? "") : "",
                    EXCH_STUD_REPTS: firstAttrSoc ? String(firstAttrSoc.EXCH_STUD_REPTS ?? "") : "",
                    STUD_DISS_WTHD: firstAttrSoc ? String(firstAttrSoc.STUD_DISS_WTHD ?? "") : "",
                    STUD_NOT_INV: firstAttrSoc ? String(firstAttrSoc.STUD_NOT_INV ?? "") : "",
                    STUD_NOT_RETURN: firstAttrSoc ? String(firstAttrSoc.STUD_NOT_RETURN ?? "") : "",
                });
            } catch (e) {
                alert("Unauthorized");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    onLogout?.();
                }, 1000);
            }
        }

        void loadAnnualData();
    }, [schoolId, schoolYearId, gradeId, onLogout]);

    // Submit
    async function saveAAESection() {
        if (!schoolId || !schoolYearId) return;

        try {
            setNotify("");

            const byKey = new Map();
            for (const r of aaeRows) byKey.set(`${r.ENROLLMENT_TYPE_CD}__${r.GENDER}`, r);

            for (const t of ["INQUIRIES", "FACULTYCHILD"]) {
                for (const g of ["M", "F", "NB", "U"]) {
                    const key = `${t}__${g}`;
                    const cell = aaeGrid[t][g];
                    const existing = byKey.get(key);

                    if (cell === "") {
                        if (existing) {
                            await deleteAAE({
                                mongoId: existing.mongoId,
                                schoolId: Number(schoolId),
                                schoolYearId: Number(schoolYearId),
                            });
                        }
                    } else {
                        const nr = Number(cell);
                        if (existing) {
                            await editAAE({
                                mongoId: existing.mongoId,
                                schoolId: Number(schoolId),
                                schoolYearId: Number(schoolYearId),
                                ENROLLMENT_TYPE_CD: t,
                                GENDER: g,
                                NR_ENROLLED: nr,
                            });
                        } else {
                            await addAAE({
                                schoolId: Number(schoolId),
                                schoolYearId: Number(schoolYearId),
                                ENROLLMENT_TYPE_CD: t,
                                GENDER: g,
                                NR_ENROLLED: nr,
                            });
                        }
                    }
                }
            }

            const refreshed = await getAAE({ schoolId, schoolYearId });
            setAaeRows(refreshed);

            setNotify("Saved Admissions: Enrollment section.");
        } catch (e) {
            setNotify(`Error saving AAE: ${String(e?.message ?? e)}`);
        }
    }

    async function saveAttritionSection({ soc }) {
        if (!schoolId || !schoolYearId) return;

        const form = soc ? attrSocForm : attrForm;
        const payload = {
            schoolId: Number(schoolId),
            schoolYearId: Number(schoolYearId),
            ...(gradeId ? { GRADE_DEF_ID: Number(gradeId) } : {}),
            STUDENTS_ADDED_DURING_YEAR: Number(form.STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(form.STUDENTS_GRADUATED ?? form.STUDENTS_GRADUATED), // safety
            EXCH_STUD_REPTS: Number(form.EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(form.STUD_DISS_WTHD),
            STUD_NOT_INV: Number(form.STUD_NOT_INV),
            STUD_NOT_RETURN: Number(form.STUD_NOT_RETURN),
        };

        try {
            setNotify("");

            const rows = soc ? attrSocRows : attrRows;
            const first = rows?.[0];

            if (first) {
                const updated = soc
                    ? await editAttritionSoc({ ...payload, mongoId: first.mongoId })
                    : await editAttrition({ ...payload, mongoId: first.mongoId });

                soc ? setAttrSocRows(updated) : setAttrRows(updated);
            } else {
                const updated = soc ? await addAttritionSoc(payload) : await addAttrition(payload);
                soc ? setAttrSocRows(updated) : setAttrRows(updated);
            }

            setNotify(soc ? "Saved Attrition (SOC) section." : "Saved Attrition section.");
        } catch (e) {
            setNotify(`Error saving attrition: ${String(e?.message ?? e)}`);
        }
    }


    // -------------------- UI --------------------
    function AnnualContextHeader() {
        return (
            <div className="mb-4">
                <h2 className="mb-1">Annual Benchmarking Form</h2>
                <div className="text-muted">
                    {selectedSchool ? (
                        <>
                            <strong>School:</strong> {selectedSchool.name} (ID: {selectedSchool.id})
                        </>
                    ) : (
                        <span>Select a school</span>
                    )}
                    {" | "}
                    {selectedYear ? (
                        <>
                            <strong>Year:</strong> {selectedYear.year ?? selectedYear.id} (ID: {selectedYear.id})
                        </>
                    ) : (
                        <span>Select a year</span>
                    )}
                    {" | "}
                    {selectedGrade ? (
                        <>
                            <strong>Grade:</strong> {selectedGrade.name ?? selectedGrade.id} (ID: {selectedGrade.id})
                        </>
                    ) : (
                        <span>Select a grade</span>
                    )}
                </div>
            </div>
        );
    }

    function SectionTabs() {
        return (
            <div className="btn-group mb-4 flex-wrap">
                {[
                    {key: "AAE", label: "Admissions: Enrollment (AAE)"},
                    {key: "ATTR", label: "Enrollment: Attrition"},
                    {key: "ATTR_SOC", label: "Enrollment: Attrition (SOC)"},
                ].map(({key, label}) => (
                    <button
                        key={key}
                        type="button"
                        className={`btn ${
                            section === key ? "btn-primary" : "btn-outline-primary"
                        }`}
                        onClick={() => {
                            setSection(key);
                            setNotify("");
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        );
    }

    function AnnualSelectors() {
        return (
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <label className="form-label">School</label>
                    {role === "school" && selectedSchool ? (
                        <input
                            type="text"
                            className="form-control"
                            value={selectedSchool.name}
                            disabled />
                    ):(
                        <select
                            className="form-select"
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
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
                        value={schoolYearId}
                        onChange={(e) => setSchoolYearId(e.target.value)}
                    >
                        {years.map((y) => (
                            <option key={y.id} value={String(y.id)}>
                                {y.year ?? y.id} (ID: {y.id})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-4">
                    <label className="form-label">Grade</label>
                    <select
                        className="form-select"
                        value={gradeId}
                        onChange={(e) => setGradeId(e.target.value)}
                    >
                        {grades.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                                {g.name ?? g.id} (ID: {g.id})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }


    return (
        <>
            <AppHeader username={username} onLogout={onLogout} role={role} schoolName={schoolName}/>
            <div className="container-fluid p-0">
                <div style={{position: "fixed", right: "20px", bottom: "20px", zIndex: 1200}}>
                    {!chatOpen && (
                        <button
                            type="button"
                            className="btn btn-primary rounded-pill"
                            onClick={() => setChatOpen(true)}
                        >
                            Chat
                        </button>
                    )}

                    {chatOpen && (
                        <div className="card shadow" style={{width: 320}}>
                            <div className="card-header d-flex justify-content-between align-items-center py-2">
                                <strong>Mini Chatbot</strong>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setChatOpen(false)}
                                >
                                    x
                                </button>
                            </div>

                            <div className="card-body" style={{maxHeight: 260, overflowY: "auto"}}>
                                {chatMessages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`mb-2 d-flex ${m.role === "user" ? "justify-content-end" : "justify-content-start"}`}
                                    >
                                        <div
                                            className={`px-2 py-1 rounded ${m.role === "user" ? "bg-primary text-white" : "bg-light border"}`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card-footer d-flex gap-2">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            sendMiniChat();
                                        }
                                    }} placeholder="Type a question"
                                />
                                <button type="button" className="btn btn-sm btn-primary" onClick={sendMiniChat}>
                                    Send
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="d-flex" style={{minHeight: "100vh"}}>
                    <div style={{flex: "0 0 auto"}}>
                        <Sidebar
                            collapsed={sidebarCollapsed}
                            onToggle={() => setSidebarCollapsed((v) => !v)}
                        />
                    </div>

                    <main className="flex-grow-1" style={{minWidth: 0}}>
                        <div className="container my-4">
                            <AnnualContextHeader/>
                            <AnnualSelectors/>
                            <SectionTabs/>

                            {notify && <div className="alert alert-info py-2">{notify}</div>}

                            <div className="card">
                                <div className="card-body">
                                    {section === "AAE" && (
                                        <AAESection
                                            aaeGrid={aaeGrid}
                                            setAaeGrid={setAaeGrid}
                                            saveAAESection={saveAAESection} s/>)}

                                    {section === "ATTR" && (
                                        <AttritionForm
                                            title="Enrollment: Attrition"
                                            form={attrForm}
                                            setForm={setAttrForm}
                                            onSave={() => saveAttritionSection({soc: false})}
                                        />
                                    )}

                                    {section === "ATTR_SOC" && (
                                        <AttritionForm
                                            title="Enrollment: Attrition (Students of Color)"
                                            form={attrSocForm}
                                            setForm={setAttrSocForm}
                                            onSave={() => saveAttritionSection({soc: true})}
                                        />
                                    )}
                            </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
