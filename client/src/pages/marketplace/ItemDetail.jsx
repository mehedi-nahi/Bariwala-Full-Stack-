import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { singleItemAPI } from "../../api/marketplaceAPI";
import { sendMessageAPI } from "../../api/messageAPI";
import { createReportAPI } from "../../api/reportAPI";

const ItemDetail = ({ user }) => {
    const { id } = useParams();
    const [item, setItem]   = useState(null);
    const [msg, setMsg]     = useState("");
    const [msgSent, setMsgSent] = useState("");

    useEffect(() => {
        singleItemAPI(id).then(res => setItem(res.data.data[0]));
    }, [id]);

    const handleContact = async () => {
        if (!msg.trim()) return;
        try {
            // marketplace messages use item id as propertyId field
            await sendMessageAPI({ itemId: id, receiverId: item.sellerInfo[0]._id, message: msg });
            setMsgSent("Message sent to seller!");
            setMsg("");
        } catch { setMsgSent("Failed to send message"); }
    };

    const handleReport = async () => {
        try {
            await createReportAPI({ reportType: "marketplace", reportedEntity: id, reason: "Fake or inappropriate listing" });
            alert("Report submitted");
        } catch { alert("Report failed"); }
    };

    if (!item) return <p>Loading...</p>;

    let seller = item.sellerInfo?.[0];

    return (
        <div className="container">
            <div className="property-images">
                {item.images?.map((img, i) => <img key={i} src={`/api/v1/get-file/${img}`} alt="item" />)}
            </div>
            <h2>{item.title}</h2>
            <p><strong>Price:</strong> ৳{item.price}</p>
            <p><strong>Condition:</strong> {item.condition}</p>
            <p><strong>Description:</strong> {item.description}</p>
            {seller && <p><strong>Seller:</strong> {seller.name} — {seller.email}</p>}

            {user && <>
                <div className="message-box">
                    <h3>Contact Seller</h3>
                    <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Write a message..." />
                    <button onClick={handleContact}>Send Message</button>
                    {msgSent && <p className="success">{msgSent}</p>}
                </div>
                <button className="btn-danger" onClick={handleReport}>Report this item</button>
            </>}
        </div>
    );
};

export default ItemDetail;

