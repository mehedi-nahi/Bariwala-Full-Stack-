// Central place that turns thrown errors into clean API responses.
// Validation / cast / duplicate-key problems are the client's fault (4xx);
// everything else is logged and answered with a generic 500 so internals never leak.
exports.sendError = (res, e) => {
    if (e?.name === "ValidationError") {
        const message = Object.values(e.errors || {})
            .map(x => x.message.replace(/Path `(\w+)`/, "$1"))
            .join(" ");
        return res.status(400).json({ success: false, message: message || "Invalid data submitted." });
    }
    if (e?.name === "CastError")
        return res.status(400).json({ success: false, message: `Invalid value for "${e.path}".` });
    if (e?.code === 11000)
        return res.status(409).json({ success: false, message: "That record already exists." });

    console.error("Unhandled controller error:", e?.stack || e);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};
