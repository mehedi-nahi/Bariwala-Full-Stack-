import { useEffect, useState } from "react";
import { adminAllUsersAPI, adminBlockUserAPI } from "../../api/adminAPI";

const AdminUsers = () => {
    const [users,    setUsers]    = useState([]);
    const [total,    setTotal]    = useState(0);
    const [page,     setPage]     = useState(1);
    const [msg,      setMsg]      = useState("");
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState("");
    const PER_PAGE = 20;

    const load = async (p = page) => {
        setLoading(true); setError("");
        try {
            const res = await adminAllUsersAPI({ pageNo: p, perPage: PER_PAGE });
            const facet = res.data.data[0] || {};
            setUsers(facet.users || []);
            setTotal(facet.totalCount?.[0]?.count || 0);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load users.");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(page); }, [page]); // eslint-disable-line

    const handleBlock = async (id) => {
        try {
            await adminBlockUserAPI(id);
            setMsg("User status updated");
            load(page);
        } catch (e) {
            setMsg(e.response?.data?.message || "Action failed");
        }
    };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <div className="container">
            <h2>All Users <span style={{ fontSize:"0.85rem", color:"#aaa", fontWeight:400 }}>({total} total)</span></h2>
            {msg   && <p className="success">{msg}</p>}
            {error && <p className="error">{error}</p>}
            {loading ? (
                <p style={{ color:"#aaa", textAlign:"center", padding:"2rem" }}>Loading users...</p>
            ) : (
                <>
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && <tr><td colSpan="6" style={{ textAlign:"center", color:"#aaa" }}>No users found.</td></tr>}
                            {users.map(u => (
                                <tr key={u._id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td style={{ textTransform:"capitalize" }}>{u.role}</td>
                                    <td>{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                                    <td><span className={`badge ${u.isBlocked ? "red" : "green"}`}>{u.isBlocked ? "Blocked" : "Active"}</span></td>
                                    <td>
                                        <button onClick={() => handleBlock(u._id)}>
                                            {u.isBlocked ? "Unblock" : "Block"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", marginTop:"1.5rem" }}>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ padding:"0.4rem 0.8rem", fontSize:"0.85rem", color:"#888" }}>Page {page} / {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminUsers;
