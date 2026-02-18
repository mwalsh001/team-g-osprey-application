export async function login(username, password) {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error("Login failed");
    return response.json();
}

export async function getEntries() {
    const response = await fetch(`/api/entries`, {
        headers: {...authHeaders()},
    });

    if (!response.ok) throw new Error("Get entries failed");
    return response.json();
}

export async function addEntry(api) {
    const response = await fetch("/submit", {
        method:'POST',
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(api)
    });
    if (!response.ok) throw new Error("Add failed");
    return response.json();
}

export async function editEntry(api) {
    const response = await fetch("/api/edit", {
        method:'POST',
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(api)
    });
    if (!response.ok) throw new Error("Edit failed");
    return response.json();
}

export async function deleteEntry(id) {
    const response = await fetch("/api/delete", {
        method:'POST',
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error("Delete failed");
    return response.json();
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}