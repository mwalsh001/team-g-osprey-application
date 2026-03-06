import { useEffect } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import {genderFilterRegion} from "../../api/annualBenchmarkingApi.js";


export default function FilterEnrollmentByGenderChart({
                                                    canvasId = "filterEnrollmentByGender",
                                                    initialSchoolId = "",
                                                    initialYearId = "",
                                                    selectedSchoolId = "",
                                                    selectedYearId = "",
                                                    selectedRegion = ""
                                                }) {
    const displaySchoolId = selectedSchoolId || initialSchoolId || "";
    const displaySchoolYear = selectedYearId || initialYearId || "";
    const displayRegion = selectedRegion ||  "";

    useEffect(() => {
        console.log("updating filter gender chart!")
        async function updateEnrollmentByGender() {
            if (!displayRegion) return;

            const payload = {
                displaySchoolId: Number(displaySchoolId),
                displaySchoolYear: Number(displaySchoolYear),
                displayRegion: displayRegion
            };

            const res = await genderFilterRegion(payload);
            console.log(res);

            if (res && Array.isArray(res)) {
                const existing = Chart.getChart(canvasId);
                if (existing) {
                    existing.destroy();
                }

                new Chart(document.getElementById(canvasId), {
                    type: "pie",
                    data: {
                        labels: ["Male", "Female", "Non-Binary"],
                        datasets: [
                            {
                                label: `Average school Enrollment`,
                                data: res,
                            },
                        ],
                    },
                });
            }
        }

        updateEnrollmentByGender();
    }, [displaySchoolId, displaySchoolYear, displayRegion, canvasId]);

    return (
        <div className="card shadow-sm">
            <div className="card-body">
                <h6 className="card-title text-center mb-3">
                    Enrollment By Gender: Schools in region {displayRegion}
                </h6>

                <div className="d-flex justify-content-center">
                    <div className="mx-auto" style={{ width: "90%", height: "300px" }}>
                        <canvas id={canvasId} className="d-block mx-auto"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}
