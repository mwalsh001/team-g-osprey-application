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
                const res2 = await chooseDisplaySchool(payload);


                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    const labels = res.map((row) => row.SCHOOL_YR_ID)
                    // Build a lookup for the second dataset
                    const map2 = Object.fromEntries(
                        res2.map(r => [r.SCHOOL_YR_ID, r.NR_ENROLLED])
                    );
                    console.log(labels[0])
                    // Align res2 to the labels from res
                    const alignedRes2 = labels.map(year => map2[year] ?? null);
                    console.log(alignedRes2)

                    new Chart(document.getElementById(canvasId), {
                        type: "bar",
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: `Enrollment by year for school ${selectedSchoolId}`,
                                    data: alignedRes2
                                },
                                {
                                    label: `Enrollment by year in region ${selectedRegion}`,
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
    }, [canvasId, displayRegion, selectedSchoolId]);

    return (
            <div>
                <canvas id={canvasId}></canvas>
            </div>
    );
}
