import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplaySchoolInquiriesYOY } from "../../api/annualBenchmarkingApi.js";

export default function InquiriesYOYChart({
    canvasId = "inquiriesYOY",
    initialSchoolId = "",
    selectedSchoolId = "",
}) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";

    useEffect(() => {
        async function updateInquiriesYOY() {
            if (!displaySchoolId) return;
            try {
                const res = await chooseDisplaySchoolInquiriesYOY({ displaySchoolId: Number(displaySchoolId) });
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [{
                                label: "Change in Total Inquiries",
                                data: res.map((row) => row.percentage),
                            }],
                        },
                        options: {
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            let label = context.dataset.label || "";
                                            if (label) label += ": ";
                                            if (context.parsed.y !== null) {
                                                label += context.parsed.y.toFixed(2) + "%";
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    ticks: {
                                        callback: function(value) {
                                            return value + "%";
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (err) {
                console.error("Inquiries YOY chart failed:", err);
            }
        }
        updateInquiriesYOY();
    }, [displaySchoolId, canvasId]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
