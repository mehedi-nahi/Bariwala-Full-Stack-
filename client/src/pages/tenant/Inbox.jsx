import { useEffect, useState } from "react";
import { inboxAPI, getConversationAPI, sendMessageAPI } from "../../api/messageAPI";

const Inbox = ({ user }) => {
    const [threads, setThreads]   = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply]       = useState("");

    useEffect(() => {
        inboxAPI().then(res => setThreads(res.data.data));
    }, []);

    const openThread = async (thread) => {
        setSelected(thread);
        let otherId = thread.sender === user.id ? thread.receiver : thread.sender;
        let res = await getConversationAPI(thread._id.property, otherId);
        setMessages(res.data.data);
    };

    const handleReply = async () => {
        if (!reply.trim() || !selected) return;
        let otherId = selected.sender === user.id ? selected.receiver : selected.sender;
        await sendMessageAPI({ propertyId: selected._id.property, receiverId: otherId, message: reply });
        setReply("");
        let res = await getConversationAPI(selected._id.property, otherId);
        setMessages(res.data.data);
    };

    return (
        <div className="container inbox">
            <div className="thread-list">
                <h3>Inbox</h3>
                {threads.length === 0 && <p style={{ padding: "1rem" }}>No messages yet.</p>}
                {threads.map((t, i) => (
                    <div key={i} className={`thread-item ${selected === t ? "active" : ""}`} onClick={() => openThread(t)}>
                        <p>{t.propertyInfo?.[0]?.area || "Property"}</p>
                        <small>{t.lastMessage}</small>
                    </div>
                ))}
            </div>
            <div className="chat-box">
                {!selected && <p style={{ padding: "1rem", color: "#999" }}>Select a conversation</p>}
                {selected && <>
                    <div className="messages">
                        {messages.map(m => (
                            <div key={m._id} className={`message ${m.sender === user.id ? "mine" : "theirs"}`}>
                                <p>{m.message}</p>
                                <small>{new Date(m.createdAt).toLocaleString()}</small>
                            </div>
                        ))}
                    </div>
                    <div className="reply-bar">
                        <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply..." onKeyDown={e => e.key === "Enter" && handleReply()} />
                        <button onClick={handleReply}>Send</button>
                    </div>
                </>}
            </div>
        </div>
    );
};

export default Inbox;

