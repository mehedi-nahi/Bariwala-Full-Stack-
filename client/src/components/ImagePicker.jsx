import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { useToast } from "../context/ToastContext";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 8;

/**
 * Multi-image uploader with drag & drop, validation, previews and per-image removal.
 *  files:    File[] (controlled)      onChange(files)
 *  existing: string[] of already-saved image URLs (shown when no new files were chosen)
 */
const ImagePicker = ({ files, onChange, max = 5, existing = [], hint, replaceNote }) => {
    const toast = useToast();
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const previews = useMemo(() => files.map(f => ({ file: f, url: URL.createObjectURL(f) })), [files]);
    useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)), [previews]);

    const addFiles = (incoming) => {
        const list = [...incoming];
        const accepted = [];
        for (const f of list) {
            if (!ALLOWED.includes(f.type)) { toast.error(`"${f.name}" is not a supported image (use JPG, PNG, WebP or GIF).`); continue; }
            if (f.size > MAX_MB * 1024 * 1024) { toast.error(`"${f.name}" is larger than ${MAX_MB} MB.`); continue; }
            accepted.push(f);
        }
        const room = max - files.length;
        if (accepted.length > room) toast.info(`You can add up to ${max} images – extra files were skipped.`);
        if (accepted.length) onChange([...files, ...accepted.slice(0, Math.max(room, 0))]);
        if (inputRef.current) inputRef.current.value = "";
    };

    const remove = (i) => onChange(files.filter((_, idx) => idx !== i));
    const full = files.length >= max;

    return (
        <div>
            <label
                className={`upload-zone${dragging ? " drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); if (!full) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); if (!full) addFiles(e.dataTransfer.files); }}
                style={full ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
                <Icon name="upload" size={26} />
                <strong>{full ? `Maximum of ${max} images reached` : "Click to upload or drag photos here"}</strong>
                <span className="small">{hint || `JPG, PNG, WebP or GIF · up to ${max} images · ${MAX_MB} MB each`}</span>
                <input
                    ref={inputRef} type="file" accept={ALLOWED.join(",")} multiple disabled={full}
                    onChange={(e) => addFiles(e.target.files)} aria-label="Upload images"
                />
            </label>

            {previews.length > 0 && (
                <div className="preview-grid">
                    {previews.map((p, i) => (
                        <div className="preview" key={p.url}>
                            <img src={p.url} alt={`New upload ${i + 1}`} />
                            {i === 0 && <span className="lbl">Cover</span>}
                            <button type="button" className="rm" onClick={() => remove(i)} aria-label={`Remove image ${i + 1}`}>
                                <Icon name="x" size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {previews.length === 0 && existing.length > 0 && (
                <div className="mt-2">
                    <p className="small muted mb-1">Current images{replaceNote ? ` — ${replaceNote}` : ""}</p>
                    <div className="preview-grid" style={{ marginTop: 0 }}>
                        {existing.map((src, i) => (
                            <div className="preview" key={src + i}>
                                <img src={src} alt={`Current image ${i + 1}`} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                                {i === 0 && <span className="lbl">Cover</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImagePicker;
