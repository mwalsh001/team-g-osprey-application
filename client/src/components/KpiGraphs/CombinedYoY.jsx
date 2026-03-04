import {useEffect} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {retentionYOY, attritionYOY} from "../../api/annualBenchmarkingApi.js";

export default function CombinedYOYChart({
                                             canvasId = "combinedYOY",
                                             initialSchoolId = "",
                                             selectedSchoolId = "",
                                         }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";

    useEffect(() => {
        async function updateCombinedYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = {displaySchoolId: Number(displaySchoolId)};
                const [retentionRes, attritionRes] = await Promise.all([
                    retentionYOY(payload),
                    attritionYOY(payload),
                ]);
                if (!retentionRes || !attritionRes) return;
                const existingChart = Chart.getChart(canvasId);
                if (existingChart) existingChart.destroy();
                new Chart(document.getElementById(canvasId), {
                    type: "line",
                    data: {
                        labels: retentionRes.map((row) => row.SCHOOL_YR_ID),
                        datasets: [
                            {
                                label: "Change in Retention Rate",
                                data: retentionRes.map((row) => row.percentage),
                            },
                            {
                                label: "Change in Attrition Rate",
                                data: attritionRes.map((row) => row.percentage),
                            },
                        ],
                    },
                    options: {
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
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
                                    callback: function (value) {
                                        return value + "%";
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (err) {
                console.error("Combined YOY chart failed:", err);
            }
        }

        updateCombinedYOY();
    }, [displaySchoolId, canvasId]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
