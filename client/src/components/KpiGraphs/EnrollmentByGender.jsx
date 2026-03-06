import {useEffect} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {chooseDisplayYear} from "../../api/annualBenchmarkingApi.js";

export default function EnrollmentByGenderChart({
                                                    canvasId = "enrollmentByGender",
                                                    initialSchoolId = "",
                                                    initialYearId = "",
                                                    selectedSchoolId = "",
                                                    selectedYearId = "",
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displaySchoolYear = selectedYearId || initialYearId || "";

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
            <div>
                <canvas id={canvasId}></canvas>
            </div>
        </div>
    );
}
