import {useEffect, useState} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {chooseDisplaySchool, chooseFilterRegion} from "../../api/annualBenchmarkingApi.js";

export default function FilterEnrollmentOverTimeChart({
                                                    canvasId = "filterEnrollmentRate",
                                                    initialSchoolId = "",
                                                    selectedSchoolId = "",
                                                    selectedRegion = ""
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displayRegion = selectedRegion ||  "";
    const [selectedYearId, setSelectedYearId] = useState("");

    useEffect(() => {
        async function updateFilterEnrollmentOverTime() {
            if (!displayRegion) return;

            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    displayRegion: displayRegion}
                const res = await chooseFilterRegion(payload);

                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();

                    new Chart(document.getElementById(canvasId), {
                        type: "bar",
                        data: {
                            labels: res.map((row) => row.SCHOOL_YR_ID),
                            datasets: [
                                {
                                    label: "Enrollment by year",
                                    data: res.map((row) => row.NR_ENROLLED),
                                },
                            ],
                        },
                    });
                }
            } catch (err) {
                console.error("Line chart failed:", err);
            }
        }

        updateFilterEnrollmentOverTime();
    }, [displaySchoolId, canvasId]);

    return (
            <div>
                <canvas id={canvasId}></canvas>
            </div>
    );
}
