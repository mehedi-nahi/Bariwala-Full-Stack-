import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Router doesn't reset scroll on navigation – do it so each page starts at the top.
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
};

export default ScrollToTop;
