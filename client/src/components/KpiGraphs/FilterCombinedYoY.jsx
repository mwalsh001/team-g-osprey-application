import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {retentionYOY, attritionYOY, filterRetentionYOY, filterAttritionYOY} from "../../api/annualBenchmarkingApi.js";

export default function FilterCombinedYOYChart({
                                             canvasId = "filterCompareCombinedYOY",
                                             initialSchoolId = "",
                                             selectedSchoolId = "",
                                             selectedRegion = ""
                                         }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displayRegion = selectedRegion ||  "";

    useEffect(() => {
        async function updateFilterCombinedYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = { displaySchoolId: Number(displaySchoolId) };
                const payloadRegion = {
                    displaySchoolId: Number(displaySchoolId),
                    displayRegion: displayRegion
                }
                const [retentionRes, attritionRes, regionFilterRetentionYOY, regionFilterAttritionYOY] = await Promise.all([
                    retentionYOY(payload),
                    attritionYOY(payload),
                    filterRetentionYOY(payloadRegion),
                    filterAttritionYOY(payloadRegion),
                ]);
                console.log("retentionYOY "+retentionRes);
                console.log("attritionYOY "+attritionRes);
                console.log("regionFilterRetentionYOY "+regionFilterRetentionYOY);
                console.log("regionFilterAttritionYOY "+regionFilterAttritionYOY);
                if (!retentionRes || !attritionRes || !regionFilterRetentionYOY || !regionFilterAttritionYOY) return;

                // Lookup maps for fast year id access
                const retentionMap = new Map(retentionRes.map(item => [item.SCHOOL_YR_ID, item.percentage]));
                const attritionMap = new Map(attritionRes.map(item => [item.SCHOOL_YR_ID, item.percentage]));

                const existingChart = Chart.getChart(canvasId);
                if (existingChart) existingChart.destroy();

                new Chart(document.getElementById(canvasId), {
                    type: "line",
                    data: {
                        labels: regionFilterRetentionYOY.map((row) => row.SCHOOL_YR_ID),
                        datasets: [
                            {
                                label: "Change in Retention Rate",
                                data: regionFilterRetentionYOY.map((row) =>
                                    retentionMap.has(row.SCHOOL_YR_ID) ? retentionMap.get(row.SCHOOL_YR_ID) : null),
                            },
                            {
                                label: "Change in Attrition Rate",
                                data: regionFilterRetentionYOY.map((row) =>
                                    attritionMap.has(row.SCHOOL_YR_ID) ? attritionMap.get(row.SCHOOL_YR_ID) : null),
                            },
                            {
                                label: "Average Change in Retention Rate",
                                data: regionFilterRetentionYOY.map((row) => row.percentage),
                            },
                            {
                                label: "Average Change in Attrition Rate",
                                data: regionFilterAttritionYOY.map((row) => row.percentage),
                            },
                        ],
                    },
                    options: {
                        spanGaps: true,
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
            } catch (err) {
                console.error("Combined YOY chart failed:", err);
            }
        }
        updateFilterCombinedYOY();
    }, [displaySchoolId, displayRegion, canvasId]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
