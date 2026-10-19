import axios from "axios";

const API = axios.create({
    baseURL: "/api/v1",
    withCredentials: true,
    timeout: 30000,
});

// Endpoints where a 401 simply means "not logged in" and must not trigger the session-expired flow.
const QUIET_401 = ["/profile", "/login", "/register"];

API.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        if (status === 401 && !QUIET_401.some(p => url.startsWith(p))) {
            // App listens for this, clears the user and sends them to the login page.
            window.dispatchEvent(new CustomEvent("auth:expired"));
        }
        return Promise.reject(error);
    }
);

export default API;
