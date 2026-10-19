import API from "./axiosInstance";

export const sendRentalRequestAPI      = (data)       => API.post("/rental-request", data);
export const cancelRentalRequestAPI    = (id)         => API.post("/cancel-rental-request/" + id);
export const myRentalRequestsAPI       = ()           => API.get("/my-rental-requests");
export const incomingRentalRequestsAPI = ()           => API.get("/incoming-rental-requests");
export const respondRentalRequestAPI   = (id, action) => API.post("/respond-rental-request/" + id, { action });
export const rentalRequestStatusAPI    = (propertyId) => API.get("/rental-request-status/" + propertyId);
