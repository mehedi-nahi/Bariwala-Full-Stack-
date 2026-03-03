import API from "./axiosInstance";

export const registerAPI      = (data) => API.post("/register", data);
export const loginAPI         = (data) => API.post("/login", data);
export const logoutAPI        = ()     => API.get("/logout");
export const profileAPI       = ()     => API.get("/profile");
export const updateProfileAPI = (data) => API.post("/update-profile", data);
export const searchTenantsAPI = (q)    => API.get("/search-tenants", { params: { q } });
export const publicProfileAPI = (id)   => API.get(`/user-profile/${id}`);
