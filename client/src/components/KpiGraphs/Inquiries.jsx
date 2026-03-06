import {useEffect} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {chooseDisplaySchoolInquiriesYOY} from "../../api/annualBenchmarkingApi.js";

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
                const res = await chooseDisplaySchoolInquiriesYOY({displaySchoolId: Number(displaySchoolId)});
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    console.log("Inquiries single school")
                    console.log(res);
                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [{
                                label: "Change in Total Inquiries",
                                data: res.map((row) => row.NR_ENROLLED),
                            }],
                        },
                        options: {
                            maintainAspectRatio: false,
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
                }
            } catch (err) {
                console.error("Inquiries YOY chart failed:", err);
            }
        }

        updateInquiriesYOY();
    }, [displaySchoolId, canvasId]);

    return (
        <div className="d-flex justify-content-center">
            <div className="mx-auto w-100" style={{ maxWidth: "900px", height: "300px" }}>
                <canvas id={canvasId} className="d-block mx-auto" style={{ height: "100%", width: "100%" }}></canvas>
            </div>
        </div>
    );
}
