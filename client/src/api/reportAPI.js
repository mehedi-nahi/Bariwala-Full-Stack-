import API from "./axiosInstance";

export const createReportAPI  = (data) => API.post("/create-report", data);
export const myReportsAPI     = ()     => API.get("/my-reports");

