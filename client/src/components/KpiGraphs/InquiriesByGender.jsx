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
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    new Chart(ctx, {
                        type: "pie",
                        data: {
                            labels: ["Male", "Female", "Non-Binary"],
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
