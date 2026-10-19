import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    inboxAPI, getConversationAPI, getItemConversationAPI, getDirectConversationAPI, sendMessageAPI,
} from "../../api/messageAPI";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../utils/errors";
import { fmtDate, money, timeAgo } from "../../utils/format";
import { ROLE_LABEL } from "../../utils/constants";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Avatar, Button, Skeleton } from "../../components/ui";
import ReportModal from "../../components/ReportModal";
import Icon from "../../components/Icon";

const keyOf = (t) => `${t.contextType}:${t.contextId}:${t.otherId}`;

const contextLabel = (t) => {
    if (t.contextType === "property") return t.contextInfo ? `${t.contextInfo.propertyType} · ${t.contextInfo.area}` : "Property (removed)";
    if (t.contextType === "item") return t.contextInfo ? t.contextInfo.title : "Item (removed)";
    return "Announcement";
};

const fetchConversation = (t) => (
    t.contextType === "property" ? getConversationAPI(t.contextId, t.otherId)
        : t.contextType === "item" ? getItemConversationAPI(t.contextId, t.otherId)
            : getDirectConversationAPI(t.otherId)
).then(r => r.data.data || []);

const Inbox = ({ user }) => {
    useDocumentTitle("Inbox");
    const toast = useToast();
    const myId = String(user?._id || user?.id || "");

    const [threads, setThreads] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [listError, setListError] = useState("");
    const [selectedKey, setSelectedKey] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const [showChat, setShowChat] = useState(false);
    const [report, setReport] = useState(false);
    const endRef = useRef(null);
    const inputRef = useRef(null);

    const selected = useMemo(() => threads.find(t => keyOf(t) === selectedKey) || null, [threads, selectedKey]);
    const selectedRef = useRef(null);
    useEffect(() => { selectedRef.current = selected; }, [selected]);

    const loadThreads = useCallback(async (silent = false) => {
        try {
            const r = await inboxAPI();
            setThreads(r.data.data || []);
            setListError("");
        } catch (e) {
            if (!silent) setListError(getErrorMessage(e));
        } finally { if (!silent) setLoadingList(false); }
    }, []);

    const loadMessages = useCallback(async (thread, silent = false) => {
        if (!thread) return;
        if (!silent) setLoadingMsgs(true);
        try {
            const list = await fetchConversation(thread);
            if (selectedRef.current && keyOf(selectedRef.current) === keyOf(thread)) setMessages(list);
            window.dispatchEvent(new Event("inbox:changed"));
        } catch (e) {
            if (!silent) toast.error(getErrorMessage(e, "Could not load this conversation."));
        } finally { if (!silent) setLoadingMsgs(false); }
    }, [toast]);

    useEffect(() => { loadThreads(); }, [loadThreads]);

    /* open the first conversation automatically on wide screens */
    useEffect(() => {
        if (!selectedKey && threads.length > 0 && window.matchMedia("(min-width: 721px)").matches) setSelectedKey(keyOf(threads[0]));
    }, [threads, selectedKey]);

    /* load messages whenever another conversation is opened */
    useEffect(() => {
        if (!selected) return;
        setMessages([]);
        loadMessages(selected);
        // only re-run when the opened conversation changes, not when its preview text updates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey]);

    /* gentle polling while the page is visible */
    useEffect(() => {
        const timer = setInterval(() => {
            if (document.hidden) return;
            loadThreads(true);
            if (selectedRef.current) loadMessages(selectedRef.current, true);
        }, 8000);
        return () => clearInterval(timer);
    }, [loadThreads, loadMessages]);

    useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, selectedKey]);

    const open = (t) => { setSelectedKey(keyOf(t)); setShowChat(true); setReply(""); setTimeout(() => inputRef.current?.focus(), 80); };

    const send = async () => {
        const text = reply.trim();
        if (!text || !selected || sending) return;
        setSending(true);
        try {
            const payload = { receiverId: selected.otherId, message: text };
            if (selected.contextType === "property") payload.propertyId = selected.contextId;
            if (selected.contextType === "item") payload.itemId = selected.contextId;
            await sendMessageAPI(payload);
            setReply("");
            await Promise.all([loadMessages(selected, true), loadThreads(true)]);
        } catch (e) {
            toast.error(getErrorMessage(e, "Message could not be sent."));
        } finally { setSending(false); }
    };

    const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);
    const filtered = search.trim()
        ? threads.filter(t => `${t.otherUser?.name || ""} ${contextLabel(t)}`.toLowerCase().includes(search.trim().toLowerCase()))
        : threads;

    /* group messages by calendar day */
    let lastDay = "";

    return (
        <div className={`chat-shell${showChat ? " show-chat" : ""}`}>
            <section className="chat-list" aria-label="Conversations">
                <div className="chat-list-head">
                    <div className="row-between">
                        <h1 style={{ fontSize: "1.25rem" }}>Inbox {totalUnread > 0 && <span className="unread-dot" aria-label={`${totalUnread} unread`}>{totalUnread}</span>}</h1>
                    </div>
                    <div className="input-icon">
                        <Icon name="search" size={16} />
                        <input type="search" placeholder="Search conversations" aria-label="Search conversations" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="chat-threads">
                    {loadingList && [0, 1, 2, 3].map(i => <div key={i} className="thread"><Skeleton h={42} w={42} style={{ borderRadius: "50%" }} /><div className="grow stack stack-xs"><Skeleton h={12} w="60%" /><Skeleton h={10} w="85%" /></div></div>)}
                    {listError && (
                        <div className="center card-pad"><p className="small muted mb-1">{listError}</p><Button size="sm" variant="secondary" onClick={() => { setLoadingList(true); loadThreads(); }}>Retry</Button></div>
                    )}
                    {!loadingList && !listError && filtered.length === 0 && (
                        <div className="center muted" style={{ padding: "2.5rem 1.2rem" }}>
                            <Icon name="chat" size={34} />
                            <p className="mt-1 strong">{search ? "No matches" : "No conversations yet"}</p>
                            <p className="small">{search ? `Nothing found for “${search}”.` : "Message a landlord or seller from a listing to start chatting."}</p>
                        </div>
                    )}
                    {filtered.map(t => (
                        <button key={keyOf(t)} className={`thread${t.unreadCount ? " unread" : ""}`} aria-current={keyOf(t) === selectedKey} onClick={() => open(t)}>
                            <Avatar name={t.otherUser?.name} size={42} />
                            <span className="grow">
                                <span className="row-between" style={{ flexWrap: "nowrap" }}>
                                    <span className="thread-name strong truncate">{t.otherUser?.name || "Unknown user"}</span>
                                    <span className="xs muted nowrap">{timeAgo(t.lastDate)}</span>
                                </span>
                                <span className="xs muted truncate" style={{ display: "block" }}>{contextLabel(t)}</span>
                                <span className="row-between" style={{ flexWrap: "nowrap" }}>
                                    <span className="thread-last small muted truncate">{t.lastFromMe ? "You: " : ""}{t.lastMessage}</span>
                                    {t.unreadCount > 0 && <span className="unread-dot">{t.unreadCount}</span>}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="chat-pane" aria-label="Conversation">
                {!selected ? (
                    <div className="page-loader">
                        <Icon name="chat" size={44} />
                        <strong>Select a conversation</strong>
                        <span className="small">Pick one from the list to read and reply.</span>
                    </div>
                ) : (<>
                    <div className="chat-head">
                        <button className="btn btn-ghost btn-icon btn-sm chat-back" onClick={() => setShowChat(false)} aria-label="Back to conversations"><Icon name="chevron-left" size={20} /></button>
                        <Avatar name={selected.otherUser?.name} size={40} />
                        <div className="grow">
                            <div className="row" style={{ gap: "0.5rem" }}>
                                <strong className="truncate">{selected.otherUser?.name || "Unknown user"}</strong>
                                {selected.otherUser?.role && <span className="badge">{ROLE_LABEL[selected.otherUser.role]}</span>}
                            </div>
                            <div className="small muted truncate">
                                {selected.contextType === "property" && selected.contextInfo && (<>
                                    <Link to={`/property/${selected.contextId}`}>{contextLabel(selected)}</Link> · {money(selected.contextInfo.monthlyRent)}/mo
                                </>)}
                                {selected.contextType === "item" && selected.contextInfo && (<>
                                    <Link to={`/marketplace/item/${selected.contextId}`}>{selected.contextInfo.title}</Link> · {money(selected.contextInfo.price)}
                                </>)}
                                {selected.contextType === "direct" && "Message from Bariwala"}
                                {!selected.contextInfo && selected.contextType !== "direct" && contextLabel(selected)}
                            </div>
                        </div>
                        {selected.otherUser && selected.otherUser.role !== "admin" && selected.otherUser.role !== user?.role && (
                            <Button variant="ghost" size="sm" icon="flag" onClick={() => setReport(true)} aria-label="Report this user">
                                <span className="hide-mobile">Report</span>
                            </Button>
                        )}
                    </div>

                    <div className="chat-messages" role="log" aria-live="polite" aria-label="Messages">
                        {loadingMsgs && <div className="center"><span className="spinner" /></div>}
                        {!loadingMsgs && messages.length === 0 && (
                            <div className="center muted" style={{ margin: "auto" }}>
                                <Icon name="chat" size={36} /><p className="mt-1 strong">No messages yet</p><p className="small">Say hello to start the conversation.</p>
                            </div>
                        )}
                        {messages.map(m => {
                            const mine = String(m.sender) === myId;
                            const day = fmtDate(m.createdAt, { weekday: "short", day: "numeric", month: "short" });
                            const sep = day !== lastDay; lastDay = day;
                            return (
                                <div key={m._id} style={{ display: "contents" }}>
                                    {sep && <div className="day-sep">{day}</div>}
                                    <div className={`bubble-row${mine ? " mine" : ""}`}>
                                        <div className="bubble">
                                            {m.message}
                                            <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={endRef} />
                    </div>

                    <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
                        <textarea
                            ref={inputRef} rows={1} value={reply} maxLength={1000} disabled={sending}
                            placeholder={`Message ${selected.otherUser?.name?.split(" ")[0] || ""}…`}
                            title="Enter to send, Shift+Enter for a new line"
                            aria-label="Write a message"
                            onChange={e => setReply(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        />
                        <Button type="submit" icon="send" loading={sending} disabled={!reply.trim()} aria-label="Send message"><span className="hide-mobile">Send</span></Button>
                    </form>
                </>)}
            </section>

            {report && selected?.otherUser && <ReportModal type="user" entityId={selected.otherId} subject={selected.otherUser.name} onClose={() => setReport(false)} />}
        </div>
    );
};

export default Inbox;
