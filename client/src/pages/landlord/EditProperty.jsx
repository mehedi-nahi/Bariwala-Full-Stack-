import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { singlePropertyAPI, updatePropertyAPI } from "../../api/propertyAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { ErrorState, PageHeader, PageLoader } from "../../components/ui";
import PropertyForm from "./PropertyForm";

const EditProperty = () => {
    useDocumentTitle("Edit property");
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [error, setError] = useState("");
    const { data: p, loading, error: loadError, reload } = useAsync(() => singlePropertyAPI(id).then(r => r.data.data[0]), [id]);

    if (loading && !p) return <PageLoader label="Loading property…" />;
    if (loadError || !p) {
        return (
            <div className="container page">
                <ErrorState message={loadError || "We couldn't find that property."} onRetry={loadError ? reload : undefined} />
                <p className="center mt-2"><Link to="/landlord/properties" className="btn btn-primary">Back to my properties</Link></p>
            </div>
        );
    }

    const initial = {
        propertyType: p.propertyType, availability: p.availability,
        monthlyRent: String(p.monthlyRent ?? ""), advanceDeposit: p.advanceDeposit ? String(p.advanceDeposit) : "",
        area: p.area || "", address: p.address || "", distanceFromMainRoad: p.distanceFromMainRoad || "",
        mapLink: p.location?.mapLink || "",
        lat: p.location?.lat ? String(p.location.lat) : "", lng: p.location?.lng ? String(p.location.lng) : "",
        facilities: p.facilities || [],
    };

    const save = async (fd) => {
        setError("");
        try {
            await updatePropertyAPI(id, fd);
            toast.success("Changes saved.");
            navigate(`/property/${id}`);
        } catch (e) {
            const msg = getErrorMessage(e, "Could not save your changes.");
            setError(msg);
            toast.error(msg);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <div className="container container-form page">
            <PageHeader
                breadcrumbs={[{ label: "My properties", to: "/landlord/properties" }, { label: "Edit" }]}
                title={`Edit ${p.propertyType} in ${p.area}`}
                subtitle="Update details, rent or availability. Changes are visible to tenants immediately."
            />
            <PropertyForm
                initial={initial} existingImages={p.images || []} replaceNote="uploading new photos replaces all of these"
                submitLabel="Save changes" savingLabel="Saving…" onSubmit={save} serverError={error}
            />
        </div>
    );
};

export default EditProperty;
