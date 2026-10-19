import { useEffect } from "react";

// Keeps the browser tab title meaningful ("Search homes · Bariwala").
const useDocumentTitle = (title) => {
    useEffect(() => {
        document.title = title ? `${title} · Bariwala` : "Bariwala – rentals & marketplace";
    }, [title]);
};

export default useDocumentTitle;
