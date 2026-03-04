import {useEffect, useState} from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { chooseDisplaySchool } from "../../api/annualBenchmarkingApi.js";

export default function FilterEnrollmentOverTimeChart({
                                                    canvasId = "filterEnrollmentRate",
                                                    initialSchoolId = "",
                                                    selectedSchoolId = "",
                                                    regions = []
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const [selectedYearId, setSelectedYearId] = useState("");
   //const [regions, setRegions] = useState([]);

    useEffect(() => {
        async function updateFilterEnrollmentOverTime() {
            if (!displaySchoolId) return;

            try {
                const payload = { displaySchoolId: Number(displaySchoolId) };
                const res = await chooseDisplaySchool(payload);

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
