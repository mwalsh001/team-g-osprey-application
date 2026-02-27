import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplaySchool } from "../../api/annualBenchmarkingApi.js";

export default function EnrollmentOverTimeChart({
                                                    schools = [],
                                                    canvasId = "enrollmentRate",
                                                    initialSchoolId = "",
                                                }) {
    const [displaySchoolId, setDisplaySchoolId] = useState(
        initialSchoolId || ""
    );

    useEffect(() => {
        if (!displaySchoolId && schools?.length) {
            setDisplaySchoolId(Number(schools[0].id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schools]);

    async function sendDisplaySchool(e) {
        setDisplaySchoolId(Number(e.target.value));
    }

    useEffect(() => {
        async function updateEnrollmentOverTime() {
            if (!displaySchoolId) return;

            try {
                const payload = { displaySchoolId: Number(displaySchoolId) };
                const res = await chooseDisplaySchool(payload);

                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();

                    new Chart(document.getElementById(canvasId), {
                        type: "bar",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [
                                {
                                    label: "Enrollment by year",
                                    data: res.map((row) => row.NR_ENROLLED),
                                },
                            ],
                        },
                    });
                }
            } catch (err) {
                console.error("Line chart failed:", err);
            }
        }

        updateEnrollmentOverTime();
    }, [displaySchoolId, canvasId]);

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
            </div>

            <div>
                <canvas id={canvasId}></canvas>
            </div>
        </div>
    );
}