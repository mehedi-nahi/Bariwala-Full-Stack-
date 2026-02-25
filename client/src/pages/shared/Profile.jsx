import { useState, useEffect } from "react";
import { profileAPI, updateProfileAPI } from "../../api/userAPI";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [form, setForm]       = useState({ name: "", phone: "" });
    const [msg, setMsg]         = useState("");

    useEffect(() => {
        profileAPI().then(res => {
            let data = res.data.data[0];
            setProfile(data);
            setForm({ name: data.name, phone: data.phone || "" });
        });
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateProfileAPI(form);
            setMsg("Profile updated successfully");
        } catch (err) {
            setMsg(err.response?.data?.message || "Update failed");
        }
    };

    if (!profile) return <p>Loading...</p>;

    return (
        <div className="container">
            <h2>My Profile</h2>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            {msg && <p className="success">{msg}</p>}
            <form onSubmit={handleSubmit}>
                <input name="name"  placeholder="Name"  value={form.name}  onChange={handleChange} required />
                <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
                <button type="submit">Update</button>
            </form>
        </div>
    );
};

export default Profile;

