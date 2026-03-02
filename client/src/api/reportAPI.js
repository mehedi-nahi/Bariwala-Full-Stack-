import API from "./axiosInstance";

export const createReportAPI  = (data) => API.post("/create-report", data);
