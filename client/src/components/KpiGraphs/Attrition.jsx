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
                                              showRegionLabels = false,
                                              attritionCollection = "ENROLL_ATTRITION",
                                          }) {

    const [displaySchoolYear, setDisplaySchoolYear] = useState("");
    const [attritionRate, setAttritionRate] = useState(null);
    const [studentsDismissed, setStudentsDismissed] = useState(null);
    const [studentsNotInvited, setStudentsNotInvited] = useState(null);
    const [studentsNotReturn, setStudentsNotReturn] = useState(null);
    const [mostCommonReason, setMostCommonReason] = useState(null);
    const getPrimaryValue = (value) => (Array.isArray(value) ? value[0] : value);

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
                if (showRegionLabels && selectedRegion !== "") {
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
                    const dissValue = getPrimaryValue(diss);
                    const notInvValue = getPrimaryValue(notInv);
                    const notRetValue = getPrimaryValue(notRet);
                    console.log("Attrition rate: "+res.attritionRate);
                    console.log("Attrition diss: "+diss);
                    console.log("Attrition notInv: "+notInv);
                    console.log("Attrition notRet: "+notRet);

                    setStudentsDismissed(diss);
                    setStudentsNotInvited(notInv);
                    setStudentsNotReturn(notRet);

                    if (res.mostCommon) {
                        setMostCommonReason(res.mostCommon);
                    } else if ([dissValue, notInvValue, notRetValue].every((v) => typeof v === "number")) {
                        const max = Math.max(dissValue, notInvValue, notRetValue);
                        if (max === 0) {
                            setMostCommonReason(null);
                        } else if (dissValue === notInvValue && notInvValue === notRetValue) {
                            setMostCommonReason(null);
                        } else {
                            const winners = [];
                            if (dissValue === max) winners.push("Dismissed or Withdrawn");
                            if (notInvValue === max) winners.push("Not Invited Back");
                            if (notRetValue === max) winners.push("Did Not Return");
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
    }, [displaySchoolId, displaySchoolYear, attritionCollection, selectedRegion, showRegionLabels]);

    useEffect(() => {
        async function updateAttritionYOY() {
            if (!displaySchoolId) return;
            try {
                const payload = {
                    displaySchoolId: Number(displaySchoolId),
                    attritionCollection,
                };
                const regionPayload = showRegionLabels && selectedRegion
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
                            label: showRegionLabels && regionRes
                                ? "My school: Change in Attrition Rate"
                                : "Change in Attrition Rate",
                            data: res.map((row) => row.percentage),
                        },
                    ];
                    if (regionRes && Array.isArray(regionRes)) {
                        const regionMap = Object.fromEntries(
                            regionRes.map((row) => [row.SCHOOL_YR_ID, row.percentage])
                        );
                        const alignedRegion = labels.map((year) => regionMap[year] ?? null);
                        datasets.push({
                            label: showRegionLabels
                                ? "Schools in region: Change in Attrition Rate"
                                : `Change in Attrition Rate (Region ${selectedRegion})`,
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
    }, [displaySchoolId, canvasId, attritionCollection, selectedRegion, showRegionLabels]);

    const renderValue = (value) => {
        if (value === null || value === undefined) return "--";
        if (Array.isArray(value)) {
            if (showRegionLabels) {
                return (
                    <>
                        {value.length >= 1 && <div>My School: {value[0]}%</div>}
                        {value.length >= 2 && <div>Schools in region {selectedRegion}: {value[1]}%</div>}
                    </>
                );
            }
            return value.length >= 1 ? `${value[0]}%` : "--";
        }
        return `${value}%`;
    };

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
                                {renderValue(attritionRate)}
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
                            {renderValue(studentsDismissed)}
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
                            {renderValue(studentsNotInvited)}
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
                            {renderValue(studentsNotReturn)}
                            <div className="fs-6 fw-medium">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}
