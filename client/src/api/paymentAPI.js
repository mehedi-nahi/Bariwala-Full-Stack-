import API from "./axiosInstance";

export const generateInvoiceAPI  = (data)      => API.post("/generate-invoice", data);
export const markAsPaidAPI       = (invoiceId) => API.post(`/pay/${invoiceId}`);
export const paymentHistoryAPI   = ()          => API.get("/payment-history");
export const singleInvoiceAPI    = (invoiceId) => API.get(`/single-invoice/${invoiceId}`);

