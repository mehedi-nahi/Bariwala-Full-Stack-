import API from "./axiosInstance";

export const createReviewAPI  = (data)   => API.post("/create-review", data);
export const userReviewsAPI   = (userId) => API.get(`/reviews/${userId}`);
export const deleteReviewAPI  = (id)     => API.delete(`/delete-review/${id}`);

