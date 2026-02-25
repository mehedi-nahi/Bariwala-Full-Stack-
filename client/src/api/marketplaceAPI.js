import API from "./axiosInstance";

export const createItemAPI   = (form)     => API.post("/create-item", form);
export const allItemsAPI     = (params)   => API.get("/all-items", { params });
export const singleItemAPI   = (id)       => API.get(`/single-item/${id}`);
export const myItemsAPI      = ()         => API.get("/my-items");
export const updateItemAPI   = (id, data) => API.post(`/update-item/${id}`, data);
export const deleteItemAPI   = (id)       => API.delete(`/delete-item/${id}`);

