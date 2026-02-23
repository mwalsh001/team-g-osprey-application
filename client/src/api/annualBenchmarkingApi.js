async function apiGet(url, errorMessage) {
    const res = await fetch(url, {
        headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

async function apiPost(url, body, errorMessage) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

// Lookups
export const getSchools = () => apiGet("/api/schools", "Get schools failed");
export const getSchoolYears = () => apiGet("/api/schoolYears", "Get school years failed");

// AAE
export const getAAE = ({ schoolId, schoolYearId }) =>
    apiGet(`/api/aae?${new URLSearchParams({ schoolId, schoolYearId })}`, "Get AAE failed");

export const addAAE = (payload) => apiPost("/api/aae", payload, "Add AAE failed");
export const editAAE = (payload) => apiPost("/api/aae/edit", payload, "Edit AAE failed");
export const deleteAAE = (payload) => apiPost("/api/aae/delete", payload, "Delete AAE failed");

// Attrition
export const getAttrition = ({ schoolId, schoolYearId }) =>
    apiGet(`/api/attrition?${new URLSearchParams({ schoolId, schoolYearId })}`, "Get attrition failed");

export const addAttrition = (payload) => apiPost("/api/attrition", payload, "Add attrition failed");
export const editAttrition = (payload) => apiPost("/api/attrition/edit", payload, "Edit attrition failed");
export const deleteAttrition = (payload) => apiPost("/api/attrition/delete", payload, "Delete attrition failed");

// Attrition SOC
export const getAttritionSoc = ({ schoolId, schoolYearId }) =>
    apiGet(`/api/attritionSoc?${new URLSearchParams({ schoolId, schoolYearId })}`, "Get attrition SOC failed");

export const addAttritionSoc = (payload) => apiPost("/api/attritionSoc", payload, "Add attrition SOC failed");
export const editAttritionSoc = (payload) => apiPost("/api/attritionSoc/edit", payload, "Edit attrition SOC failed");
export const deleteAttritionSoc = (payload) => apiPost("/api/attritionSoc/delete", payload, "Delete attrition SOC failed");

export const chooseDisplaySchool = (payload) => apiPost("/api/chooseDisplaySchool", payload, "Choose display school failed");

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}
