import { useState } from "react";
import { sendMessageAPI } from "../api/messageAPI";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/errors";
import { Button, Field } from "./ui";

/**
 * Compose-and-send box used on listing pages.
 *   payload: { propertyId } or { itemId }, plus receiverId
 */
const MessageComposer = ({ payload, placeholder, label = "Your message", sendLabel = "Send message", successText = "Message sent! Replies will appear in your inbox.", onSent }) => {
    const toast = useToast();
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!text.trim()) { setError("Write a message first."); return; }
        setSending(true);
        setError("");
        try {
            await sendMessageAPI({ ...payload, message: text.trim() });
            toast.success(successText);
            setText("");
            window.dispatchEvent(new Event("inbox:changed"));
            onSent?.();
        } catch (err) {
            setError(getErrorMessage(err, "Could not send your message."));
        } finally { setSending(false); }
    };

    return (
        <form onSubmit={submit} noValidate>
            <Field label={label} error={error}>
                <textarea value={text} maxLength={1000} placeholder={placeholder} onChange={e => { setText(e.target.value); setError(""); }} />
            </Field>
            <div className="row-between">
                <span className="char-count">{text.length}/1000</span>
                <Button type="submit" icon="send" loading={sending} disabled={!text.trim()}>{sendLabel}</Button>
            </div>
        </form>
    );
};

export default MessageComposer;
