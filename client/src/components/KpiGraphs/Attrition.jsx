import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { attritionYOY, getAttritionRate } from "../../api/annualBenchmarkingApi.js";

export default function AttritionYOYChart({
                                              years = [],
                                              canvasId = "attritionYOY",
                                              initialSchoolId = "",
                                              selectedSchoolId = "",
                                              selectedYearId = "",
                                          }) {

    const [displaySchoolYear, setDisplaySchoolYear] = useState("");
    const [attritionRate, setAttritionRate] = useState(null);
    const [mostCommonReason, setMostCommonReason] = useState(null);

    const displaySchoolId = selectedSchoolId || initialSchoolId || "";

    useEffect(() => {
        if (selectedYearId) {
            setDisplaySchoolYear(String(selectedYearId));
            return;
        }
        if (!displaySchoolYear && years?.length) setDisplaySchoolYear(String(years[0].id));
    }, [selectedYearId, years, displaySchoolYear]);

    useEffect(() => {
        async function updateAttrition() {
            if (!displaySchoolId || !displaySchoolYear) return;
            try {
                const res = await getAttritionRate({
                    displaySchoolId: Number(displaySchoolId),
                    displaySchoolYear: Number(displaySchoolYear),
                });
                if (res) {
                    setAttritionRate(res.attritionRate);
                    setMostCommonReason(res.mostCommon);
                }
            } catch (err) {
                console.error("Attrition rate failed:", err);
            }
        }
        updateAttrition();
    }, [displaySchoolId, displaySchoolYear]);

    useEffect(() => {
        async function updateAttritionYOY() {
            if (!displaySchoolId) return;
            try {
                const res = await attritionYOY({ displaySchoolId: Number(displaySchoolId) });
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [{
                                label: "Change in Attrition Rate",
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
                console.error("Attrition YOY chart failed:", err);
            }
        }
        updateAttritionYOY();
    }, [displaySchoolId, canvasId]);

    return (
        <div className="d-flex flex-column gap-3">
            <div className="card shadow-sm text-center">
                <div className="card-body">
                    <h6 className="card-title text-muted mb-1">Attrition Rate</h6>
                    <div className="fs-4 fw-semibold">
                        {attritionRate !== null ? `${attritionRate}%` : "--"}
                    </div>
                </div>
            </div>

            <div className="card shadow-sm text-center">
                <div className="card-body">
                    <h6 className="card-title text-muted">Most Common Reason</h6>
                    <div className="fs-6 fw-medium">
                        {mostCommonReason ?? "--"}
                    </div>
                </div>
            </div>
        </div>
    );
}
