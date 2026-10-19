import { useState } from "react";
import { createReportAPI } from "../api/reportAPI";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/errors";
import Modal from "./Modal";
import { Alert, Button, Field } from "./ui";

const REASONS = {
    property: ["Fake or misleading listing", "Wrong price or photos", "Already rented", "Scam or suspicious"],
    marketplace: ["Fake or misleading listing", "Prohibited item", "Wrong price or photos", "Scam or suspicious"],
    user: ["Rude or abusive behaviour", "Scam or suspicious", "Fake profile", "Spam"],
};

/**
 * One consistent "Report" dialog for listings, items and users.
 *   type: "property" | "marketplace" | "user"      entityId: the reported record      subject: shown to the user
 */
const ReportModal = ({ type, entityId, subject, onClose }) => {
    const toast = useToast();
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (reason.trim().length < 10) { setError("Please describe the problem in at least 10 characters."); return; }
        setSending(true);
        setError("");
        try {
            await createReportAPI({ reportType: type, reportedEntity: entityId, reason: reason.trim() });
            toast.success("Report submitted. Thank you – our team will review it.");
            onClose();
        } catch (err) {
            setError(getErrorMessage(err, "Could not submit the report."));
        } finally { setSending(false); }
    };

    return (
        <Modal
            title={`Report ${type === "user" ? "user" : "listing"}`} onClose={onClose}
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="danger" type="submit" form="report-form" loading={sending}>Submit report</Button>
            </>}
        >
            <form id="report-form" onSubmit={submit} noValidate>
                {subject && <p className="muted">You are reporting <strong>{subject}</strong>.</p>}
                <div className="row-wrap" role="group" aria-label="Common reasons">
                    {REASONS[type].map(r => (
                        <button type="button" key={r} className="chip" aria-pressed={reason === r} onClick={() => { setReason(r); setError(""); }}>{r}</button>
                    ))}
                </div>
                <Field label="What happened?" error={error} required hint="Add as much detail as you can – it helps us act faster.">
                    <textarea value={reason} maxLength={500} onChange={e => { setReason(e.target.value); setError(""); }} placeholder="Describe the problem…" data-autofocus />
                </Field>
                <div className="char-count">{reason.length}/500</div>
                <Alert tone="info">Reports are confidential. False reports may lead to account action.</Alert>
            </form>
        </Modal>
    );
};

export default ReportModal;
