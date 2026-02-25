import API from "./axiosInstance";

export const adminAllUsersAPI        = (params) => API.get("/admin/all-users", { params });
export const adminBlockUserAPI       = (id)     => API.post(`/admin/block-user/${id}`);
export const adminRemoveListingAPI   = (id)     => API.delete(`/admin/remove-listing/${id}`);
export const adminRemoveItemAPI      = (id)     => API.delete(`/admin/remove-item/${id}`);
export const adminAllReportsAPI      = (params) => API.get("/admin/all-reports", { params });
export const adminUpdateReportAPI    = (id, data) => API.post(`/admin/update-report/${id}`, data);
export const adminAllTransactionsAPI = (params) => API.get("/admin/all-transactions", { params });

