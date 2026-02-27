import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplayYear } from "../../api/annualBenchmarkingApi.js";

export default function EnrollmentByGenderChart({
                                                    schools = [],
                                                    years = [],
                                                    canvasId = "enrollmentByGender",
                                                    initialSchoolId = "",
                                                    initialYearId = "",
                                                }) {
    const [displaySchoolId, setDisplaySchoolId] = useState(initialSchoolId || "");
    const [displaySchoolYear, setDisplaySchoolYear] = useState(initialYearId || "");

    useEffect(() => {
        if (!displaySchoolId && schools?.length) {
            setDisplaySchoolId(String(schools[0].id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schools]);

    useEffect(() => {
        if (!displaySchoolYear && years?.length) {
            setDisplaySchoolYear(String(years[0].id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [years]);

    async function sendDisplaySchool(e) {
        setDisplaySchoolId(Number(e.target.value));
    }

    async function sendDisplayYear(e) {
        setDisplaySchoolYear(Number(e.target.value));
    }

    useEffect(() => {
        async function updateEnrollmentByGender() {
            if (!displaySchoolId || !displaySchoolYear) return;

            const payload = {
                displaySchoolId: Number(displaySchoolId),
                displaySchoolYear: Number(displaySchoolYear),
            };

            const res = await chooseDisplayYear(payload);
            const ctx = document.getElementById(canvasId);

            console.log(res);

            if (ctx && res && Array.isArray(res)) {
                const existing = Chart.getChart(canvasId);
                if (existing) {
                    existing.destroy();
                }

                new Chart(ctx, {
                    type: "pie",
                    data: {
                        labels: ["Male", "Female", "Non-Binary"],
                        datasets: [
                            {
                                label: "School Enrollment by Gender",
                                data: res,
                            },
                        ],
                    },
                });
            }
        }

        updateEnrollmentByGender();
    }, [displaySchoolId, displaySchoolYear, canvasId]);

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "end",
                    marginBottom: "1rem",
                }}
            >
                <label>
                    School
                    <br />
                    <select value={displaySchoolId} onChange={(e) => sendDisplaySchool(e)}>
                        {schools.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                                {s.name} (ID: {s.id})
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    School Year
                    <br />
                    <select value={displaySchoolYear} onChange={(e) => sendDisplayYear(e)}>
                        {years.map((y) => (
                            <option key={y.id} value={String(y.id)}>
                                {y.year ?? y.id} (ID: {y.id})
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div>
                <canvas id={canvasId}></canvas>
            </div>
        </div>
    );
}