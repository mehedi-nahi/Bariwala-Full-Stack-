import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../utils/errors";

/**
 * Runs an async loader on mount / when `deps` change and tracks loading + error state.
 *   const { data, loading, error, reload, setData } = useAsync(() => api().then(r => r.data.data), [id]);
 * `reload(true)` refreshes silently (no loading flash). Out-of-order responses are ignored.
 */
const useAsync = (fn, deps = []) => {
    const [state, setState] = useState({ data: null, loading: true, error: "" });
    const fnRef = useRef(fn);
    const reqRef = useRef(0);
    const mounted = useRef(true);

    useEffect(() => { fnRef.current = fn; });
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const run = useCallback(async (silent = false) => {
        const id = ++reqRef.current;
        if (!silent) setState(s => ({ ...s, loading: true, error: "" }));
        try {
            const data = await fnRef.current();
            if (mounted.current && id === reqRef.current) setState({ data, loading: false, error: "" });
            return data;
        } catch (e) {
            if (mounted.current && id === reqRef.current)
                setState(s => ({ ...s, loading: false, error: getErrorMessage(e) }));
            return undefined;
        }
    }, []);

    useEffect(() => { run(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    const setData = useCallback((next) => {
        setState(s => ({ ...s, data: typeof next === "function" ? next(s.data) : next }));
    }, []);

    return { ...state, reload: run, setData };
};

export default useAsync;
