import { useEffect, useState } from "react";
import { adminAllUsersAPI, adminBlockUserAPI } from "../../api/adminAPI";

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [msg, setMsg]     = useState("");

    const load = () => adminAllUsersAPI().then(res => setUsers(res.data.data[0]?.users || []));

    useEffect(() => { load(); }, []);

    const handleBlock = async (id) => {
        await adminBlockUserAPI(id);
        setMsg("User status updated");
        load();
    };

    return (
        <div className="container">
            <h2>All Users</h2>
            {msg && <p className="success">{msg}</p>}
            <table>
                <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u._id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
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
        </div>
    );
};

export default AdminUsers;

