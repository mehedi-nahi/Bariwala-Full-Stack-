import API from "./axiosInstance";

export const generateInvoiceAPI = (data)              => API.post("/generate-invoice", data);
export const markAsPaidAPI      = (invoiceId, method)  => API.post(`/pay/${invoiceId}`, { paymentMethod: method });
export const extendInvoiceAPI   = (invoiceId, days)    => API.post(`/extend-invoice/${invoiceId}`, { days });
export const paymentHistoryAPI  = ()                   => API.get("/payment-history");
export const singleInvoiceAPI   = (invoiceId)          => API.get(`/single-invoice/${invoiceId}`);
