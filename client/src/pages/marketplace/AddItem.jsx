import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createItemAPI } from "../../api/marketplaceAPI";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { CATEGORIES, CONDITIONS } from "../../utils/constants";
import { getErrorMessage } from "../../utils/errors";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Button, Field, PageHeader } from "../../components/ui";
import ImagePicker from "../../components/ImagePicker";
import Select from "../../components/Select";

const AddItem = () => {
    useDocumentTitle("Sell an item");
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();
    const [form, setForm] = useState({ title: "", description: "", price: "", condition: "Used", category: "Furniture" });
    const [images, setImages] = useState([]);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setServerError(""); };

    const submit = async (e) => {
        e.preventDefault();
        const err = {};
        if (form.title.trim().length < 3) err.title = "Give your item a title (at least 3 characters).";
        if (!form.price || Number(form.price) <= 0) err.price = "Enter a price greater than 0.";
        setErrors(err);
        if (Object.keys(err).length) return;

        if (images.length === 0) {
            const ok = await confirm({ title: "Post without photos?", confirmText: "Post anyway", message: "Items with photos sell much faster. You can't add photos later, so consider adding some now." });
            if (!ok) return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("title", form.title.trim());
            fd.append("description", form.description.trim());
            fd.append("price", form.price);
            fd.append("condition", form.condition);
            fd.append("category", form.category);
            images.forEach(img => fd.append("images", img));
            const res = await createItemAPI(fd);
            toast.success("Your item is live!");
            navigate(`/marketplace/item/${res.data.data._id}`);
        } catch (e2) {
            const msg = getErrorMessage(e2, "Could not post your item.");
            setServerError(msg);
            toast.error(msg);
        } finally { setSaving(false); }
    };

    return (
        <div className="container container-form page">
            <PageHeader
                breadcrumbs={[{ label: "My listings", to: "/marketplace/my-items" }, { label: "Sell an item" }]}
                title="Sell an item" subtitle="A clear title, honest condition and a few photos are all you need."
            />
            <form onSubmit={submit} noValidate className="stack stack-lg">
                {serverError && <Alert tone="error">{serverError}</Alert>}

                <section className="card card-pad stack stack-md" aria-labelledby="s1">
                    <h2 id="s1" style={{ fontSize: "1.1rem" }}>Details</h2>
                    <Field label="Title" error={errors.title} required>
                        <input maxLength={100} placeholder="e.g. Wooden dining table with 4 chairs" value={form.title} onChange={e => set("title", e.target.value)} />
                    </Field>
                    <div className="form-grid">
                        <Field label="Category"><Select value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</Select></Field>
                        <Field label="Condition"><Select value={form.condition} onChange={e => set("condition", e.target.value)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</Select></Field>
                    </div>
                    <Field label="Description" optional hint="Size, age, defects, why you're selling.">
                        <textarea maxLength={2000} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe your item…" />
                    </Field>
                </section>

                <section className="card card-pad stack stack-md" aria-labelledby="s2">
                    <h2 id="s2" style={{ fontSize: "1.1rem" }}>Price</h2>
                    <Field label="Asking price" error={errors.price} required htmlFor="item-price">
                        <div className="input-group"><span className="input-prefix">৳</span><input id="item-price" type="number" inputMode="numeric" min="1" placeholder="0" value={form.price} onChange={e => set("price", e.target.value)} /></div>
                    </Field>
                </section>

                <section className="card card-pad stack stack-md" aria-labelledby="s3">
                    <h2 id="s3" style={{ fontSize: "1.1rem" }}>Photos</h2>
                    <ImagePicker files={images} onChange={setImages} max={5} />
                </section>

                <div className="form-actions">
                    <Link to="/marketplace/my-items" className="btn btn-secondary">Cancel</Link>
                    <Button type="submit" size="lg" loading={saving}>{saving ? "Posting…" : "Post item for sale"}</Button>
                </div>
            </form>
        </div>
    );
};

export default AddItem;
