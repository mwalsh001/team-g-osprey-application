import {useEffect} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {chooseDisplayYear} from "../../api/annualBenchmarkingApi.js";

export default function InquiriesByGenderChart({
                                                   canvasId = "inquiriesByGender",
                                                   initialSchoolId = "",
                                                   selectedSchoolId = "",
                                                   initialSchoolYear = "",
                                                   selectedSchoolYear = "",
                                                   selectedYearId = "",
                                               }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displaySchoolYear = selectedSchoolYear || selectedYearId || initialSchoolYear || "";

    useEffect(() => {
        async function updateInquiriesByGender() {
            if (!displaySchoolId || !displaySchoolYear) return;
            try {
                const res = await chooseDisplayYear({
                    displaySchoolId: Number(displaySchoolId),
                    displaySchoolYear: Number(displaySchoolYear),
                    includeFacultyChild: false,
                });
                const ctx = document.getElementById(canvasId);
                if (ctx && res && Array.isArray(res)) {
                    const total = res.reduce((sum, value) => sum + Number(value || 0), 0);
                    const baseLabels = ["Male", "Female", "Non-Binary"];
                    const labels = baseLabels.map((label, index) => {
                        const value = Number(res[index] || 0);
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        return `${label} (${percent}%)`;
                    });
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    new Chart(ctx, {
                        type: "pie",
                        data: {
                            labels,
                            datasets: [{
                                label: "School Inquiries by Gender",
                                data: res,
                            }],
                        },
                    });
                }
            } catch (err) {
                console.error("Inquiries by gender chart failed:", err);
            }
        }

        updateInquiriesByGender();
    }, [displaySchoolId, displaySchoolYear, canvasId]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
