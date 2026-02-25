const mongoose = require("mongoose");
const bcrypt    = require("bcryptjs");

const DataSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // landlord | tenant | marketplace | admin
    role: {
        type: String,
        enum: ["landlord", "tenant", "marketplace", "admin"],
        default: "tenant"
    },
    profileImg: {
        type: String,
        default: ""
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

// Hash Password before saving
DataSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const userModel = mongoose.model("users", DataSchema);
module.exports = userModel;

