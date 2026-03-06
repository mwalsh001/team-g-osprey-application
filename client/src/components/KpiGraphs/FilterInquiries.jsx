import {useEffect, useState} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {
    chooseDisplaySchool,
    chooseDisplaySchoolInquiriesYOY, chooseFilterDisplaySchoolInquiriesYOY,
    chooseFilterRegion
} from "../../api/annualBenchmarkingApi.js";

export default function FilterInquiriesYOYChart({
                                                    canvasId = "filterInquiriesYOY",
                                                    initialSchoolId = "",
                                                    selectedSchoolId = "",
                                                    selectedRegion = "",
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displayRegion = selectedRegion ||  "";
    const [selectedYearId, setSelectedYearId] = useState("");

    useEffect(() => {
        async function updateFilterInquiriesYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    displayRegion: displayRegion}
                const res = await chooseFilterDisplaySchoolInquiriesYOY(payload);
                console.log("filter regions: "+res);
                const res2 = await chooseDisplaySchoolInquiriesYOY(payload);
                console.log("filter single school: "+res2);
                const labels = res.map((row) => row.SCHOOL_YR_ID)
                // Build a lookup for the second dataset
                const map2 = Object.fromEntries(
                    res2.map(r => [r.SCHOOL_YR_ID, r.NR_ENROLLED])
                );
                console.log(labels[0])
                // Align res2 to the labels from res
                const alignedRes2 = labels.map(year => map2[year] ?? null);
                console.log(alignedRes2)
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    const schoolColor = "rgba(54, 162, 235, 0.6)";
                    const schoolBorder = "rgba(54, 162, 235, 1)";
                    const regionColor = "rgba(255, 99, 132, 0.6)";
                    const regionBorder = "rgba(255, 99, 132, 1)";

                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: `Inquiries by year for school ${selectedSchoolId}`,
                                    data: alignedRes2,
                                    backgroundColor: schoolColor,
                                    borderColor: schoolBorder,
                                    pointBackgroundColor: schoolBorder,
                                },
                                {
                                    label: `Inquiries by year in region ${selectedRegion}`,
                                    data: res.map((row) => row.NR_ENROLLED),
                                    backgroundColor: regionColor,
                                    borderColor: regionBorder,
                                    pointBackgroundColor: regionBorder,
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
                }
            } catch (err) {
                console.error("Filter Inquiries YOY chart failed:", err);
            }
        }
        updateFilterInquiriesYOY();
    }, [displaySchoolId, displayRegion, canvasId]);

    return (
        <div>
            <canvas id={canvasId}></canvas>
        </div>
    );
}
