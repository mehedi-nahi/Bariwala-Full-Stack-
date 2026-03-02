import API from "./axiosInstance";

export const generateInvoiceAPI = (data)              => API.post("/generate-invoice", data);
export const markAsPaidAPI      = (invoiceId, paymentMethod) => API.post("/pay/" + invoiceId, { paymentMethod });
export const extendInvoiceAPI   = (invoiceId, days)   => API.post("/extend-invoice/" + invoiceId, { days });
export const paymentHistoryAPI  = ()                  => API.get("/payment-history");
export const singleInvoiceAPI   = (invoiceId)         => API.get("/single-invoice/" + invoiceId);
export const myTenantsAPI       = ()                  => API.get("/my-tenants");
