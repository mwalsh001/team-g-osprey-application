import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplayYear } from "../../api/annualBenchmarkingApi.js";

export default function EnrollmentByGenderChart({
                                                    canvasId = "enrollmentByGender",
                                                    initialSchoolId = "",
                                                    initialYearId = "",
                                                    selectedSchoolId = "",
                                                    selectedYearId = "",
                                                    selectedYearLabel = "",
                                                    embedded = false,
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

                new Chart(ctx, {
                    type: "pie",
                    data: {
                        labels,
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

    const content = (
        <>
            <h6 className="card-title text-center mb-3">
                {selectedYearLabel
                    ? `Enrollment By Gender In ${selectedYearLabel}`
                    : displaySchoolYear
                        ? `Enrollment By Gender In ${displaySchoolYear}`
                        : "Enrollment By Gender"}
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
