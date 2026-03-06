import {useEffect} from "react";
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
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
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
        <div className="card shadow-sm">
            <div className="card-body">
                <h6 className="card-title text-center mb-3">
                    Enrollment Over Time by Region
                </h6>
                <div className="d-flex justify-content-center">
                    <div className="mx-auto w-100" style={{ maxWidth: "900px", height: "300px" }}>
                        <canvas id={canvasId} className="d-block mx-auto" style={{ height: "100%", width: "100%" }}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}
