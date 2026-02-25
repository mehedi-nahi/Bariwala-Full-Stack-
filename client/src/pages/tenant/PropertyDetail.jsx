import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { singlePropertyAPI } from "../../api/propertyAPI";
import { sendMessageAPI } from "../../api/messageAPI";
import { createReportAPI } from "../../api/reportAPI";
import { createReviewAPI, userReviewsAPI } from "../../api/reviewAPI";

const PropertyDetail = ({ user }) => {
    const { id } = useParams();
    const [property, setProperty]   = useState(null);
    const [reviews, setReviews]     = useState([]);
    const [msg, setMsg]             = useState("");
    const [msgSent, setMsgSent]     = useState("");
    const [review, setReview]       = useState({ rating: 5, comment: "", targetId: "" });
    const [reviewMsg, setReviewMsg] = useState("");

    useEffect(() => {
        singlePropertyAPI(id).then(res => {
            let p = res.data.data[0];
            setProperty(p);
            if (p?.landlordInfo?.[0]?._id) {
                userReviewsAPI(p.landlordInfo[0]._id).then(r => setReviews(r.data.data));
            }
        });
    }, [id]);

    const handleMessage = async () => {
        if (!msg.trim()) return;
        try {
            await sendMessageAPI({ propertyId: id, receiverId: property.landlordInfo[0]._id, message: msg });
            setMsgSent("Message sent!");
            setMsg("");
        } catch { setMsgSent("Failed to send message"); }
    };

    const handleReport = async () => {
        try {
            await createReportAPI({ reportType: "property", reportedEntity: id, reason: "Fake listing / inappropriate content" });
            alert("Report submitted");
        } catch { alert("Report failed"); }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        setReviewMsg("");
        // tenant rates landlord, landlord rates tenant (targetId required for landlord)
        let isTenant    = user?.role === "tenant";
        let isLandlord  = user?.role === "landlord";
        let revieweeId  = isTenant   ? property.landlordInfo[0]._id : review.targetId;
        let reviewType  = isTenant   ? "tenant-to-landlord" : "landlord-to-tenant";
        if (isLandlord && !review.targetId) {
            setReviewMsg("Please enter the Tenant ID to rate.");
            return;
        }
        try {
            await createReviewAPI({ revieweeId, propertyId: id, reviewType, rating: review.rating, comment: review.comment });
            setReviewMsg("Review submitted!");
        } catch (err) { setReviewMsg(err.response?.data?.message || "Review failed"); }
    };

    if (!property) return <p>Loading...</p>;

    let landlord   = property.landlordInfo?.[0];
    let isTenant   = user?.role === "tenant";
    let isLandlord = user?.role === "landlord";

    return (
        <div className="container">
            <div className="property-images">
                {property.images?.map((img, i) => <img key={i} src={`/api/v1/get-file/${img}`} alt="property" />)}
            </div>
            <h2>{property.propertyType} in {property.area}</h2>
            <p><strong>Rent:</strong> ৳{property.monthlyRent}/month</p>
            <p><strong>Deposit:</strong> ৳{property.advanceDeposit}</p>
            <p><strong>Address:</strong> {property.address}</p>
            <p><strong>Distance from main road:</strong> {property.distanceFromMainRoad}</p>
            <p><strong>Facilities:</strong> {property.facilities?.join(", ")}</p>
            {property.location?.mapLink && <a href={property.location.mapLink} target="_blank" rel="noreferrer">View on Map</a>}
            <span className={`badge ${property.availability === "Available" ? "green" : "red"}`}>{property.availability}</span>
            {landlord && <p style={{ marginTop: "0.5rem" }}><strong>Landlord:</strong> {landlord.name} — {landlord.email}</p>}

            {user && <>
                {/* Tenant: contact landlord */}
                {isTenant && (
                    <div className="message-box">
                        <h3>Contact Landlord</h3>
                        <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Write a message..." />
                        <button onClick={handleMessage}>Send Message</button>
                        {msgSent && <p className="success">{msgSent}</p>}
                    </div>
                )}

                {/* Reviews section */}
                <div className="review-box">
                    <h3>Landlord Reviews ({reviews.length})</h3>
                    {reviews.map(r => (
                        <div className="review-item" key={r._id}>
                            <strong>{r.reviewerInfo?.[0]?.name}</strong> — {"⭐".repeat(r.rating)}
                            <p>{r.comment}</p>
                        </div>
                    ))}

                    {/* Tenant rates landlord / Landlord rates tenant */}
                    {(isTenant || isLandlord) && (
                        <>
                            <h3 style={{ marginTop: "1rem" }}>{isTenant ? "Rate this Landlord" : "Rate a Tenant"}</h3>
                            {reviewMsg && <p className="success">{reviewMsg}</p>}
                            <form onSubmit={handleReview}>
                                {isLandlord && (
                                    <input
                                        placeholder="Enter Tenant ID"
                                        value={review.targetId}
                                        onChange={e => setReview({ ...review, targetId: e.target.value })}
                                        required
                                    />
                                )}
                                <select value={review.rating} onChange={e => setReview({ ...review, rating: Number(e.target.value) })}>
                                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? "s" : ""}</option>)}
                                </select>
                                <textarea placeholder="Comment..." value={review.comment} onChange={e => setReview({ ...review, comment: e.target.value })} />
                                <button type="submit">Submit Review</button>
                            </form>
                        </>
                    )}
                </div>

                <button className="btn-danger" onClick={handleReport} style={{ marginTop: "1rem" }}>Report this listing</button>
            </>}
        </div>
    );
};

export default PropertyDetail;
