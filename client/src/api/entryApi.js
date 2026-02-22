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


function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}
