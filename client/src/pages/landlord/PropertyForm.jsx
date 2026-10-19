import { useState } from "react";
import { Link } from "react-router-dom";
import { FACILITIES, PROPERTY_TYPES } from "../../utils/constants";
import { useConfirm } from "../../context/ConfirmContext";
import { Alert, Button, Field } from "../../components/ui";
import ImagePicker from "../../components/ImagePicker";
import Icon from "../../components/Icon";
import Select from "../../components/Select";

const EMPTY = {
    propertyType: "Flat", availability: "Available", monthlyRent: "", advanceDeposit: "",
    area: "", address: "", distanceFromMainRoad: "", mapLink: "", lat: "", lng: "", facilities: [],
};

/** Shared by "Add property" and "Edit property". `onSubmit(FormData)` handles its own errors. `confirmNoPhotos` asks before publishing a listing without photos (create only). */
const PropertyForm = ({ initial, existingImages = [], submitLabel, savingLabel, replaceNote, onSubmit, serverError, confirmNoPhotos = false }) => {
    const confirm = useConfirm();
    const [form, setForm] = useState({ ...EMPTY, ...initial });
    const [images, setImages] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
    const toggleFacility = (f) => set("facilities", form.facilities.includes(f) ? form.facilities.filter(x => x !== f) : [...form.facilities, f]);

    const validate = () => {
        const e = {};
        const rent = Number(form.monthlyRent);
        if (form.monthlyRent === "" || !Number.isFinite(rent) || rent <= 0) e.monthlyRent = "Enter a monthly rent greater than 0.";
        if (form.advanceDeposit !== "" && (!Number.isFinite(Number(form.advanceDeposit)) || Number(form.advanceDeposit) < 0)) e.advanceDeposit = "Deposit can't be negative.";
        if (!form.area.trim()) e.area = "Enter the area or neighbourhood.";
        if (!form.address.trim()) e.address = "Enter the full address.";
        if (form.mapLink && !/^https?:\/\/\S+$/i.test(form.mapLink.trim())) e.mapLink = "Paste a full link starting with https://";
        if (form.lat !== "" && (Number(form.lat) < -90 || Number(form.lat) > 90 || Number.isNaN(Number(form.lat)))) e.lat = "Latitude must be between -90 and 90.";
        if (form.lng !== "" && (Number(form.lng) < -180 || Number(form.lng) > 180 || Number.isNaN(Number(form.lng)))) e.lng = "Longitude must be between -180 and 180.";
        setErrors(e);
        if (Object.keys(e).length) {
            // bring the first problem into view
            setTimeout(() => document.querySelector(".has-error input, .has-error select, .has-error textarea")?.focus(), 0);
        }
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        if (confirmNoPhotos && images.length === 0 && existingImages.length === 0) {
            const ok = await confirm({
                title: "Post without photos?", confirmText: "Post anyway",
                message: "Listings with photos get far more requests. You can add photos later by editing the property.",
            });
            if (!ok) return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("propertyType", form.propertyType);
            fd.append("availability", form.availability);
            fd.append("monthlyRent", form.monthlyRent);
            fd.append("advanceDeposit", form.advanceDeposit === "" ? "0" : form.advanceDeposit);
            fd.append("area", form.area.trim());
            fd.append("address", form.address.trim());
            fd.append("distanceFromMainRoad", form.distanceFromMainRoad.trim());
            fd.append("facilities", JSON.stringify(form.facilities));
            fd.append("location", JSON.stringify({ lat: form.lat, lng: form.lng, mapLink: form.mapLink.trim() }));
            images.forEach(img => fd.append("images", img));
            await onSubmit(fd);
        } finally { setSaving(false); }
    };

    return (
        <form onSubmit={submit} noValidate className="stack stack-lg">
            {serverError && <Alert tone="error">{serverError}</Alert>}

            <section className="card card-pad stack stack-md" aria-labelledby="sec-basic">
                <h2 id="sec-basic" style={{ fontSize: "1.1rem" }}>1 · The basics</h2>
                <div className="field">
                    <span className="field-label" id="type-lbl">Property type</span>
                    <div className="choice-grid" role="radiogroup" aria-labelledby="type-lbl">
                        {PROPERTY_TYPES.map(t => (
                            <button key={t} type="button" role="radio" aria-checked={form.propertyType === t} className="choice" onClick={() => set("propertyType", t)}>
                                <span className="choice-title">{t}</span>
                                <span className="choice-desc">{t === "Flat" ? "Whole apartment" : t === "Room" ? "A room in a shared home" : "Take over an existing lease"}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="form-grid">
                    <Field label="Monthly rent" error={errors.monthlyRent} required htmlFor="pf-rent">
                        <div className="input-group"><span className="input-prefix">৳</span><input id="pf-rent" type="number" inputMode="numeric" min="1" placeholder="12000" value={form.monthlyRent} onChange={e => set("monthlyRent", e.target.value)} /></div>
                    </Field>
                    <Field label="Advance deposit" error={errors.advanceDeposit} optional htmlFor="pf-dep">
                        <div className="input-group"><span className="input-prefix">৳</span><input id="pf-dep" type="number" inputMode="numeric" min="0" placeholder="24000" value={form.advanceDeposit} onChange={e => set("advanceDeposit", e.target.value)} /></div>
                    </Field>
                    <Field label="Availability" hint="Rented listings are hidden from search.">
                        <Select value={form.availability} onChange={e => set("availability", e.target.value)}>
                            <option value="Available">Available now</option>
                            <option value="Rented">Already rented</option>
                        </Select>
                    </Field>
                </div>
            </section>

            <section className="card card-pad stack stack-md" aria-labelledby="sec-loc">
                <h2 id="sec-loc" style={{ fontSize: "1.1rem" }}>2 · Location</h2>
                <div className="form-grid">
                    <Field label="Area / neighbourhood" error={errors.area} required><input placeholder="e.g. Mirpur 10, Dhanmondi" value={form.area} onChange={e => set("area", e.target.value)} /></Field>
                    <Field label="Distance from main road" optional><input placeholder="e.g. 200 meters" value={form.distanceFromMainRoad} onChange={e => set("distanceFromMainRoad", e.target.value)} /></Field>
                    <Field label="Full address" error={errors.address} required className="span-2"><input placeholder="House no., road, area, city" value={form.address} onChange={e => set("address", e.target.value)} /></Field>
                    <Field label="Google Maps link" error={errors.mapLink} optional hint="Open the place in Google Maps → Share → Copy link." className="span-2">
                        <input type="url" placeholder="https://maps.google.com/…" value={form.mapLink} onChange={e => set("mapLink", e.target.value)} />
                    </Field>
                </div>
                <details>
                    <summary className="link-btn small">Add exact coordinates (optional)</summary>
                    <div className="form-grid mt-1">
                        <Field label="Latitude" error={errors.lat}><input type="number" step="any" placeholder="23.8103" value={form.lat} onChange={e => set("lat", e.target.value)} /></Field>
                        <Field label="Longitude" error={errors.lng}><input type="number" step="any" placeholder="90.4125" value={form.lng} onChange={e => set("lng", e.target.value)} /></Field>
                    </div>
                </details>
            </section>

            <section className="card card-pad stack stack-md" aria-labelledby="sec-fac">
                <h2 id="sec-fac" style={{ fontSize: "1.1rem" }}>3 · Facilities</h2>
                <div className="row-wrap" role="group" aria-labelledby="sec-fac">
                    {FACILITIES.map(f => (
                        <button key={f} type="button" className="chip" aria-pressed={form.facilities.includes(f)} onClick={() => toggleFacility(f)}>
                            {form.facilities.includes(f) && <Icon name="check" size={14} />}{f}
                        </button>
                    ))}
                </div>
                <p className="small muted">{form.facilities.length ? `${form.facilities.length} selected` : "Pick everything the home offers – tenants can filter by these."}</p>
            </section>

            <section className="card card-pad stack stack-md" aria-labelledby="sec-photos">
                <h2 id="sec-photos" style={{ fontSize: "1.1rem" }}>4 · Photos</h2>
                <ImagePicker files={images} onChange={setImages} max={5} existing={existingImages} replaceNote={replaceNote} />
            </section>

            <div className="form-actions">
                <Link to="/landlord/properties" className="btn btn-secondary">Cancel</Link>
                <Button type="submit" size="lg" loading={saving}>{saving ? savingLabel : submitLabel}</Button>
            </div>
        </form>
    );
};

export default PropertyForm;
