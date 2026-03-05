import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplaySchool } from "../../api/annualBenchmarkingApi.js";

export default function EnrollmentOverTimeChart({
                                                    canvasId = "enrollmentRate",
                                                    initialSchoolId = "",
                                                    selectedSchoolId = "",
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";

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
        <div className="card shadow-sm">
            <div className="card-body">
                <h6 className="card-title text-center mb-3">
                    Enrollment Over Time
                </h6>

                <div className="d-flex justify-content-center">
                    <div style={{ width: "90%", height: "250px" }}>
                        <canvas id={canvasId}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}
