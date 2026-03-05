import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { retentionYOY, attritionYOY, attritionRatesYearly } from "../../api/annualBenchmarkingApi.js";

export default function CombinedYOYChart({
                                             canvasId = "combinedYOY",
                                             initialSchoolId = "",
                                             selectedSchoolId = "",
                                             attritionCollection = "ENROLL_ATTRITION",
                                             deriveRetentionFromAttrition = false,
                                         }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";

    useEffect(() => {
        async function updateCombinedYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = { displaySchoolId: Number(displaySchoolId) };
                let retentionRes = null;
                let attritionRes = null;
                if (deriveRetentionFromAttrition) {
                    const rates = await attritionRatesYearly({...payload, attritionCollection});
                    if (!rates?.length) return;
                    const derived = [];
                    for (let i = 1; i < rates.length; i++) {
                        const prevAttr = Number(rates[i - 1].attritionRate);
                        const currAttr = Number(rates[i].attritionRate);
                        const prevRet = 100 - prevAttr;
                        const currRet = 100 - currAttr;

                        if (prevAttr <= 0 || currAttr <= 0 || prevRet <= 0 || currRet <= 0) continue;

                        derived.push({
                            SCHOOL_YR_ID: rates[i].SCHOOL_YR_ID,
                            attritionPct: ((currAttr - prevAttr) / prevAttr) * 100,
                            retentionPct: ((currRet - prevRet) / prevRet) * 100,
                        });
                    }
                    retentionRes = derived.map((row) => ({
                        SCHOOL_YR_ID: row.SCHOOL_YR_ID,
                        percentage: row.retentionPct,
                    }));
                    attritionRes = derived.map((row) => ({
                        SCHOOL_YR_ID: row.SCHOOL_YR_ID,
                        percentage: row.attritionPct,
                    }));
                } else {
                    const response = await Promise.all([
                        retentionYOY(payload),
                        attritionYOY({...payload, attritionCollection}),
                    ]);
                    retentionRes = response[0];
                    attritionRes = response[1];
                }

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
        updateCombinedYOY();
    }, [displaySchoolId, canvasId, attritionCollection, deriveRetentionFromAttrition]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
