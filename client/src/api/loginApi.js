const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
}

async function parseResponse(response, fallbackMessage) {
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`${fallbackMessage}: non-JSON response from server`);
        }
    }

    if (!response.ok) {
        const message = data?.message || fallbackMessage;
        throw new Error(message);
    }

    if (!data) {
        throw new Error(`${fallbackMessage}: empty response body`);
    }

    return data;
}

export async function login(username, password, role) {
    const response = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
    });
    return parseResponse(response, "Login failed");
}

export async function createSchoolAccount(username, password, schoolName) {
    const response = await fetch(apiUrl("/api/admin/create-school"), {
        method: 'POST',
        headers: {"Content-Type": "application/json", ...authHeaders()},
        body: JSON.stringify({username, password, schoolName}),
    });
    return parseResponse(response, "Create school account failed");
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}
