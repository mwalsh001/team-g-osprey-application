import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {
    retentionYOY,
    attritionYOY,
    filterRetentionYOY,
    filterAttritionYOY,
    attritionRatesYearly,
    filterAttritionRatesYearly,
} from "../../api/annualBenchmarkingApi.js";

export default function FilterCombinedYOYChart({
                                             canvasId = "filterCompareCombinedYOY",
                                             initialSchoolId = "",
                                             selectedSchoolId = "",
                                             selectedRegion = "",
                                             attritionCollection = "ENROLL_ATTRITION",
                                             deriveRetentionFromAttrition = false,
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
                    displayRegion: displayRegion,
                }
                if (deriveRetentionFromAttrition) {
                    const [rates, regionRates] = await Promise.all([
                        attritionRatesYearly({...payload, attritionCollection}),
                        filterAttritionRatesYearly({ displayRegion, attritionCollection }),
                    ]);
                    if (!rates?.length || !regionRates?.length) return;

                    const schoolDerived = [];
                    for (let i = 1; i < rates.length; i++) {
                        const prevAttr = Number(rates[i - 1].attritionRate);
                        const currAttr = Number(rates[i].attritionRate);
                        const prevRet = 100 - prevAttr;
                        const currRet = 100 - currAttr;

                        if (prevAttr <= 0 || currAttr <= 0 || prevRet <= 0 || currRet <= 0) continue;

                        schoolDerived.push({
                            SCHOOL_YR_ID: rates[i].SCHOOL_YR_ID,
                            attritionPct: ((currAttr - prevAttr) / prevAttr) * 100,
                            retentionPct: ((currRet - prevRet) / prevRet) * 100,
                        });
                    }

                    const regionDerived = [];
                    for (let i = 1; i < regionRates.length; i++) {
                        const prevAttr = Number(regionRates[i - 1].attritionRate);
                        const currAttr = Number(regionRates[i].attritionRate);
                        const prevRet = 100 - prevAttr;
                        const currRet = 100 - currAttr;

                        if (prevAttr <= 0 || currAttr <= 0 || prevRet <= 0 || currRet <= 0) continue;

                        regionDerived.push({
                            SCHOOL_YR_ID: regionRates[i].SCHOOL_YR_ID,
                            attritionPct: ((currAttr - prevAttr) / prevAttr) * 100,
                            retentionPct: ((currRet - prevRet) / prevRet) * 100,
                        });
                    }

                    const schoolRetentionMap = new Map(schoolDerived.map(row => [row.SCHOOL_YR_ID, row.retentionPct]));
                    const schoolAttritionMap = new Map(schoolDerived.map(row => [row.SCHOOL_YR_ID, row.attritionPct]));

                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();

                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels: regionDerived.map((row) => row.SCHOOL_YR_ID),
                            datasets: [
                                {
                                    label: "Change in Retention Rate",
                                    data: regionDerived.map((row) =>
                                        schoolRetentionMap.has(row.SCHOOL_YR_ID)
                                            ? schoolRetentionMap.get(row.SCHOOL_YR_ID)
                                            : null),
                                },
                                {
                                    label: "Change in Attrition Rate",
                                    data: regionDerived.map((row) =>
                                        schoolAttritionMap.has(row.SCHOOL_YR_ID)
                                            ? schoolAttritionMap.get(row.SCHOOL_YR_ID)
                                            : null),
                                },
                                {
                                    label: "Average Change in Retention Rate",
                                    data: regionDerived.map((row) => row.retentionPct),
                                },
                                {
                                    label: "Average Change in Attrition Rate",
                                    data: regionDerived.map((row) => row.attritionPct),
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
                    return;
                }

                const [retentionRes, attritionRes, regionFilterRetentionYOY, regionFilterAttritionYOY] = await Promise.all([
                    retentionYOY(payload),
                    attritionYOY({...payload, attritionCollection}),
                    filterRetentionYOY({...payloadRegion, attritionCollection}),
                    filterAttritionYOY({...payloadRegion, attritionCollection}),
                ]);
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
    }, [displaySchoolId, displayRegion, canvasId, attritionCollection, deriveRetentionFromAttrition]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
