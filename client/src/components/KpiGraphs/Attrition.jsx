import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { attritionYOY, getAttritionRate } from "../../api/annualBenchmarkingApi.js";

export default function AttritionYOYChart({
                                              schools = [],
                                              years = [],
                                              canvasId = "attritionYOY",
                                              initialSchoolId = "",
                                          }) {

    const [displaySchoolId, setDisplaySchoolId] = useState(initialSchoolId || "");
    const [displaySchoolYear, setDisplaySchoolYear] = useState("");
    const [attritionRate, setAttritionRate] = useState(null);
    const [mostCommonReason, setMostCommonReason] = useState(null);

    useEffect(() => {
        if (!displaySchoolId && schools?.length) {
            setDisplaySchoolId(String(schools[0].id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schools]);

    useEffect(() => {
        if (!displaySchoolYear && years?.length) {
            setDisplaySchoolYear(Number(years[0].id));
        }
    }, [years]);

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
        <div>
            <label>
                School
                <br/>
                <select value={displaySchoolId} onChange={(e) => setDisplaySchoolId(Number(e.target.value))}>
                    {schools.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                            {s.name} (ID: {s.id})
                        </option>
                    ))}
                </select>
            </label>
            <label>
                School Year
                <br/>
                <select value={displaySchoolYear} onChange={(e) => setDisplaySchoolYear(Number(e.target.value))}>
                    {years.map((y) => (
                        <option key={y.id} value={String(y.id)}>
                            {y.year ?? y.id} (ID: {y.id})
                        </option>
                    ))}
                </select>
            </label>
            <div>
                <p>Attrition Rate</p>
                {attritionRate !== null ? `${attritionRate}%` : "--"}
                <p>Most Common Reason</p>
                {mostCommonReason ?? "--"}
            </div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
