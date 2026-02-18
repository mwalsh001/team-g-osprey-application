export function getUsername() {
    return localStorage.getItem("username");
}

export function setUsername(username) {
    localStorage.setItem("username", username);
}

export function clearAuth() {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
}