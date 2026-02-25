import API from "./axiosInstance";

export const sendMessageAPI      = (data)                    => API.post("/send-message", data);
export const getConversationAPI  = (propertyId, otherUserId) => API.get(`/conversation/${propertyId}/${otherUserId}`);
export const inboxAPI            = ()                        => API.get("/inbox");

