export async function login(username, password, role) {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
    });
    if (!response.ok) throw new Error("Login failed");
    return response.json();
}

export async function createSchoolAccount(username, password, schoolName) {
    const response = await fetch("/api/admin/create-school", {
        method: 'POST',
        headers: {"Content-Type": "application/json", ...authHeaders()},
        body: JSON.stringify({username, password, schoolName}),
    });
    if (!response.ok) throw new Error("Create school account failed");
    return response.json();
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}
