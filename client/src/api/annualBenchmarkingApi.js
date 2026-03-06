async function apiGet(url, errorMessage) {
    const res = await fetch(url, {
        headers: {...authHeaders()},
    });
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

async function apiPost(url, body, errorMessage) {
    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json", ...authHeaders()},
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

// Lookups
export const getSchools = () => apiGet("/api/schools", "Get schools failed");
export const getSchoolYears = () => apiGet("/api/schoolYears", "Get school years failed");
export const getSchoolRegions = () => apiGet("/api/schoolRegions", "Get school regions failed");
export const getGrades = () => apiGet("/api/grades", "Get grades failed");

// AAE
export const getAAE = ({schoolId, schoolYearId}) =>
    apiGet(`/api/aae?${new URLSearchParams({schoolId, schoolYearId})}`, "Get AAE failed");

export const addAAE = (payload) => apiPost("/api/aae", payload, "Add AAE failed");
export const editAAE = (payload) => apiPost("/api/aae/edit", payload, "Edit AAE failed");
export const deleteAAE = (payload) => apiPost("/api/aae/delete", payload, "Delete AAE failed");

// Attrition
export const getAttrition = ({schoolId, schoolYearId, gradeId}) => {
    const params = new URLSearchParams({schoolId, schoolYearId});
    if (gradeId !== undefined && gradeId !== null && gradeId !== "") params.set("gradeId", gradeId);
    return apiGet(`/api/attrition?${params}`, "Get attrition failed");
};

export const addAttrition = (payload) => apiPost("/api/attrition", payload, "Add attrition failed");
export const editAttrition = (payload) => apiPost("/api/attrition/edit", payload, "Edit attrition failed");

// Attrition SOC
export const getAttritionSoc = ({schoolId, schoolYearId, gradeId}) => {
    const params = new URLSearchParams({schoolId, schoolYearId});
    if (gradeId !== undefined && gradeId !== null && gradeId !== "") params.set("gradeId", gradeId);
    return apiGet(`/api/attritionSoc?${params}`, "Get attrition SOC failed");
};

export const addAttritionSoc = (payload) => apiPost("/api/attritionSoc", payload, "Add attrition SOC failed");
export const editAttritionSoc = (payload) => apiPost("/api/attritionSoc/edit", payload, "Edit attrition SOC failed");

export const chooseDisplaySchool = (payload) => apiPost("/api/chooseDisplaySchool", payload, "Choose display school failed");
export const chooseFilterRegion= (payload) => apiPost("/api/chooseFilterRegion", payload, "Choose filter region school failed");
export const chooseDisplayYear = (payload) => apiPost("/api/chooseDisplayYear", payload, "Choose display year failed");

export const chooseDisplaySchoolInquiriesYOY = (payload) => apiPost("/api/chooseDisplaySchoolInquiriesYOY", payload, "Choose display year failed");
export const retentionYOY = (payload) => apiPost("/api/retentionYOY", payload, "Retention YOY failed");
export const attritionYOY = (payload) => apiPost("/api/attritionYOY", payload, "Attrition YOY failed");

export const getRetention = (payload) => apiPost("/api/retention", payload, "Get retention failed");
export const getAttritionRate = (payload) => apiPost("/api/attritionYear", payload, "Get attrition failed");

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? {Authorization: `Bearer ${token}`} : {};
}
