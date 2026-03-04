import {useEffect} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {chooseDisplaySchool} from "../../api/annualBenchmarkingApi.js";

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
                const payload = {displaySchoolId: Number(displaySchoolId)};
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
            <div>
                <canvas id={canvasId}></canvas>
            </div>
        </div>
    );
}
