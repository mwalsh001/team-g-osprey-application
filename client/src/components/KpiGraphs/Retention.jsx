import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { retentionYOY, getRetention } from "../../api/annualBenchmarkingApi.js";


export default function RetentionYOYChart ({
                                               years = [],
                                               canvasId = "retentionYOY",
                                               initialSchoolId = "",
                                               selectedSchoolId = "",
                                               selectedYearId = "",
                                                selectedRegion = ""
                                           }) {

    const [displaySchoolYear, setDisplaySchoolYear] = useState("");
    const [retentionRate, setRetentionRate] = useState(null);
    const displayRegion = selectedRegion ||  "";

    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displaySchoolYearLabel =
        years?.find((y) => String(y.id) === String(displaySchoolYear))?.year ??
        displaySchoolYear;


    useEffect(() => {
        if (selectedYearId) {
            setDisplaySchoolYear(String(selectedYearId));
            return;
        }
        if (!displaySchoolYear && years?.length) setDisplaySchoolYear(String(years[0].id));
    }, [selectedYearId, years, displaySchoolYear]);

    useEffect(() => {
        async function updateRetention() {
            if (!displaySchoolId || !displaySchoolYear) return;
            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    displaySchoolYear: Number(displaySchoolYear)
                }
                if(displayRegion !== ""){
                    payload.displayRegion = displayRegion
                }
                console.log("payload:" + payload)
                const res = await getRetention(payload);
                if (res) setRetentionRate(res);
                console.log("retentionRate: ", retentionRate)
            } catch (err) {
                console.error("Retention rate failed:", err);
            }
        }
        updateRetention();
    }, [displaySchoolId, displaySchoolYear, displayRegion]);

    useEffect(() => {
        async function updateRetentionYOY() {
            if (!displaySchoolId) return;
            try {
                const res = await retentionYOY({ displaySchoolId: Number(displaySchoolId) });
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [{
                                label: "Change in Retention Rate",
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
                console.error("Retention YOY chart failed:", err);
            }
        }
        updateRetentionYOY();
    }, [displaySchoolId, canvasId]);

    return (
        <div className="d-flex flex-column gap-3">
            <div className="card shadow-sm text-center">
                <div className="card-body">
                    <h6 className="card-title text-muted mb-1">
                        Retention Rate{displaySchoolYearLabel ? ` in ${displaySchoolYearLabel}` : ""}
                    </h6>
                    <div className="fs-4 fw-semibold">
                        {/* Always show the first rate if data exists */}
                        {retentionRate !== null && retentionRate.length >= 1 && (
                            <div>My School: {retentionRate[0]}%</div>
                        )}

                        {/* Only show the second rate if the array has at least two items */}
                        {retentionRate !== null && retentionRate.length >= 2 && (
                            <div>Schools in region {displayRegion}: {retentionRate[1]}%</div>
                        )}

                        {/* Fallback if data hasn't loaded yet */}
                        {retentionRate === null && "--"}
                    </div>
                </div>
            </div>


        </div>

    );
}
