// Turns anything thrown by axios into a sentence a normal person can act on.
export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const serverMessage = err?.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (err?.code === "ERR_NETWORK" || (err?.request && !err?.response))
        return "Can't reach the server. Please check your internet connection and try again.";
    if (err?.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (err?.response?.status === 413) return "That upload is too large.";
    return fallback;
};
