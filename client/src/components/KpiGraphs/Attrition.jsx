import { useEffect, useState } from "react";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js/auto/+esm";
import { attritionYOY, attritionYOYByRegion, getAttritionRate } from "../../api/annualBenchmarkingApi.js";

export default function AttritionYOYChart({
                                              years = [],
                                              canvasId = "attritionYOY",
                                              initialSchoolId = "",
                                              selectedSchoolId = "",
                                              selectedYearId = "",
                                              selectedRegion = "",
                                              attritionCollection = "ENROLL_ATTRITION",
                                          }) {

    const [displaySchoolYear, setDisplaySchoolYear] = useState("");
    const [attritionRate, setAttritionRate] = useState(null);
    const [studentsDismissed, setStudentsDismissed] = useState(null);
    const [studentsNotInvited, setStudentsNotInvited] = useState(null);
    const [studentsNotReturn, setStudentsNotReturn] = useState(null);
    const [mostCommonReason, setMostCommonReason] = useState(null);

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
        async function updateAttrition() {
            if (!displaySchoolId || !displaySchoolYear) return;
            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    displaySchoolYear: Number(displaySchoolYear),
                    attritionCollection,
                }
                if(selectedRegion !== ""){
                    payload.displayRegion = selectedRegion
                }
                //console.log("Attrition payload: "+payload);
                const res = await getAttritionRate(payload);
                // console.log("Attrition res: "+res.toString());
                if (res) {
                    setAttritionRate(res.attritionRate);
                    const diss = res.dissOrWthd ?? null;
                    const notInv = res.notInvited ?? null;
                    const notRet = res.notReturn ?? null;
                    console.log("Attrition rate: "+res.attritionRate);
                    console.log("Attrition diss: "+diss);
                    console.log("Attrition notInv: "+notInv);
                    console.log("Attrition notRet: "+notRet);

                    setStudentsDismissed(diss);
                    setStudentsNotInvited(notInv);
                    setStudentsNotReturn(notRet);

                    if (res.mostCommon) {
                        setMostCommonReason(res.mostCommon);
                    } else if ([diss, notInv, notRet].every((v) => typeof v === "number")) {
                        const max = Math.max(diss, notInv, notRet);
                        if (max === 0) {
                            setMostCommonReason(null);
                        } else if (diss === notInv && notInv === notRet) {
                            setMostCommonReason(null);
                        } else {
                            const winners = [];
                            if (diss === max) winners.push("Dismissed or Withdrawn");
                            if (notInv === max) winners.push("Not Invited Back");
                            if (notRet === max) winners.push("Did Not Return");
                            setMostCommonReason(winners.join("|"));
                        }
                    } else {
                        setMostCommonReason(null);
                    }
                }
            } catch (err) {
                console.error("Attrition rate failed:", err);
            }
        }
        updateAttrition();
    }, [displaySchoolId, displaySchoolYear, attritionCollection]);

    useEffect(() => {
        async function updateAttritionYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    attritionCollection,
                };
                const regionPayload = selectedRegion
                    ? { displayRegion: selectedRegion, attritionCollection }
                    : null;
                const [res, regionRes] = await Promise.all([
                    attritionYOY(payload),
                    regionPayload ? attritionYOYByRegion(regionPayload) : null,
                ]);
                if (res) {
                    const existingChart = Chart.getChart(canvasId);
                    if (existingChart) existingChart.destroy();
                    const labels = res.map((row) => row.SCHOOL_YR_ID);
                    const datasets = [
                        {
                            label: "Change in Attrition Rate",
                            data: res.map((row) => row.percentage),
                        },
                    ];
                    if (regionRes && Array.isArray(regionRes)) {
                        const regionMap = Object.fromEntries(
                            regionRes.map((row) => [row.SCHOOL_YR_ID, row.percentage])
                        );
                        const alignedRegion = labels.map((year) => regionMap[year] ?? null);
                        datasets.push({
                            label: `Change in Attrition Rate (Region ${selectedRegion})`,
                            data: alignedRegion,
                        });
                    }
                    new Chart(document.getElementById(canvasId), {
                        type: "line",
                        data: {
                            labels,
                            datasets,
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
    }, [displaySchoolId, canvasId, attritionCollection]);

    return (
        <div>
            <div>
                <div className="d-flex flex-column gap-3">
                    <div className="card shadow-sm text-center">
                        <div className="card-body">
                            <h6 className="card-title text-muted mb-1">
                                Attrition Rate{displaySchoolYearLabel ? ` in ${displaySchoolYearLabel}` : ""}
                            </h6>
                            <div className="fs-4 fw-semibold">
                                {/* Always show the first rate if data exists */}
                                {attritionRate !== null && attritionRate.length >= 1 && (
                                    <div>My School: {attritionRate[0]}%</div>
                                )}
                                {/* Only show the second rate if the array has at least 2 items */}
                                {attritionRate !== null && attritionRate.length >= 2 && (
                                    <div>Schools in region {selectedRegion}: {attritionRate[1]}%</div>
                                )}
                                {/* Fallback if data hasn't loaded yet */}
                                {attritionRate === null && "--"}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`card shadow-sm text-center ${
                            mostCommonReason?.includes("Dismissed or Withdrawn") ? "border border-2 border-warning bg-warning-subtle" : ""
                        }`}
                    >
                        <div className="card-body">
                            <h6 className="card-title text-muted">
                                Dismissed or Withdrew During the Year{displaySchoolYearLabel ? ` in ${displaySchoolYearLabel}` : ""}
                            </h6>
                            {studentsDismissed !== null && studentsDismissed.length >= 1 && (
                                <div>My School: {studentsDismissed[0]}%</div>
                            )}
                            {studentsDismissed !== null && studentsDismissed.length >= 2 && (
                                <div>Schools in region {selectedRegion}: {studentsDismissed[1]}%</div>
                            )}
                            {studentsDismissed === null && "--"}
                            <div className="fs-6 fw-medium">
                            </div>
                        </div>
                    </div>

                    <div
                        className={`card shadow-sm text-center ${
                            mostCommonReason?.includes("Not Invited Back") ? "border border-2 border-warning bg-warning-subtle" : ""
                        }`}
                    >
                        <div className="card-body">
                            <h6 className="card-title text-muted">
                                Not invited to Return{displaySchoolYearLabel ? ` in ${displaySchoolYearLabel}` : ""}
                            </h6>
                            {studentsNotInvited !== null && studentsNotInvited.length >= 1 && (
                                <div>My School: {studentsNotInvited[0]}%</div>
                            )}
                            {studentsNotInvited !== null && studentsNotInvited.length >= 2 && (
                                <div>Schools in region {selectedRegion}: {studentsNotInvited[1]}%</div>
                            )}
                            {studentsNotInvited === null && "--"}
                            <div className="fs-6 fw-medium">
                            </div>
                        </div>
                    </div>

                    <div
                        className={`card shadow-sm text-center ${
                            mostCommonReason?.includes("Did Not Return") ? "border border-2 border-warning bg-warning-subtle" : ""
                        }`}
                    >
                        <div className="card-body">
                            <h6 className="card-title text-muted">
                                Did Not Return by Choice{displaySchoolYearLabel ? ` in ${displaySchoolYearLabel}` : ""}
                            </h6>
                            {studentsNotReturn !== null && studentsNotReturn.length >= 1 && (
                                <div>My School: {studentsNotReturn[0]}%</div>
                            )}
                            {studentsNotReturn !== null && studentsNotReturn.length >= 2 && (
                                <div>Schools in region {selectedRegion}: {studentsNotReturn[1]}%</div>
                            )}
                            {studentsNotReturn === null && "--"}
                            <div className="fs-6 fw-medium">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}
