import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPropertyAPI } from "../../api/propertyAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui";
import PropertyForm from "./PropertyForm";

const AddProperty = () => {
    useDocumentTitle("Add property");
    const navigate = useNavigate();
    const toast = useToast();
    const [error, setError] = useState("");

    const save = async (fd) => {
        setError("");
        try {
            const res = await createPropertyAPI(fd);
            toast.success("Property listed! Tenants can find it now.");
            navigate(`/property/${res.data.data._id}`);
        } catch (e) {
            const msg = getErrorMessage(e, "Could not create the property.");
            setError(msg);
            toast.error(msg);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <div className="container container-form page">
            <PageHeader
                breadcrumbs={[{ label: "My properties", to: "/landlord/properties" }, { label: "Add property" }]}
                title="List a new property"
                subtitle="Good photos and an accurate address help tenants decide faster."
            />
            <PropertyForm confirmNoPhotos submitLabel="Publish listing" savingLabel="Publishing…" onSubmit={save} serverError={error} />
        </div>
    );
};

export default AddProperty;
