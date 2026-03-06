import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {genderFilterRegion} from "../../api/annualBenchmarkingApi.js";


export default function FilterEnrollmentByGenderChart({
                                                    canvasId = "filterEnrollmentByGender",
                                                    initialSchoolId = "",
                                                    initialYearId = "",
                                                    selectedSchoolId = "",
                                                    selectedYearId = "",
                                                    selectedRegion = "",
                                                    embedded = false,
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displaySchoolYear = selectedYearId || initialYearId || "";
    const displayRegion = selectedRegion ||  "";

    useEffect(() => {
        console.log("updating filter gender chart!")
        async function updateEnrollmentByGender() {
            if (!displayRegion) return;

            const payload = {
                displaySchoolId: Number(displaySchoolId),
                displaySchoolYear: Number(displaySchoolYear),
                displayRegion: displayRegion
            };

            const res = await genderFilterRegion(payload);
            console.log(res);

            if (res && Array.isArray(res)) {
                const total = res.reduce((sum, value) => sum + Number(value || 0), 0);
                const baseLabels = ["Male", "Female", "Non-Binary"];
                const labels = baseLabels.map((label, index) => {
                    const value = Number(res[index] || 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                    return `${label} (${percent}%)`;
                });
                const existing = Chart.getChart(canvasId);
                if (existing) {
                    existing.destroy();
                }

                new Chart(document.getElementById(canvasId), {
                    type: "pie",
                    data: {
                        labels,
                        datasets: [
                            {
                                label: `Average school Enrollment`,
                                data: res,
                                backgroundColor: [
                                    "rgba(54, 162, 235, 0.6)",
                                    "rgba(255, 99, 132, 0.6)",
                                    "rgba(255, 206, 86, 0.6)",
                                ],
                                borderColor: [
                                    "rgba(54, 162, 235, 1)",
                                    "rgba(255, 99, 132, 1)",
                                    "rgba(255, 206, 86, 1)",
                                ],
                                borderWidth: 1,
                            },
                        ],
                    },
                });
            }
        }

        updateEnrollmentByGender();
    }, [displaySchoolId, displaySchoolYear, displayRegion, canvasId]);

    const content = (
        <>
            <h6 className="card-title text-center mb-3">
                Enrollment By Gender: {displayRegion} Average
            </h6>

            <div className="d-flex justify-content-center">
                <div className="mx-auto" style={{ width: "85%", height: "260px" }}>
                    <canvas id={canvasId} className="d-block mx-auto"></canvas>
                </div>
            </div>
        </>
    );

    if (embedded) {
        return <div>{content}</div>;
    }

    return (
        <div className="card shadow-sm">
            <div className="card-body">
                {content}
            </div>
        </div>
    );
}
