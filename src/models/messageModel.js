const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    // conversation context — property for rental, item for marketplace
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "properties",
        default: null
    },
    // marketplace item context (optional)
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "marketplaces",
        default: null
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

const messageModel = mongoose.model("messages", DataSchema);
module.exports = messageModel;

