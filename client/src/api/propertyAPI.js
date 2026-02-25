import API from "./axiosInstance";

export const createPropertyAPI       = (form)         => API.post("/create-property", form);
export const allPropertiesAPI        = (params)       => API.get("/all-properties", { params });
export const singlePropertyAPI       = (id)           => API.get(`/single-property/${id}`);
export const myPropertiesAPI         = ()             => API.get("/my-properties");
export const updatePropertyAPI       = (id, data)     => API.post(`/update-property/${id}`, data);
export const deletePropertyAPI       = (id)           => API.delete(`/delete-property/${id}`);
export const changeAvailabilityAPI   = (id, data)     => API.post(`/change-availability/${id}`, data);

