const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
    // conversation participants
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "properties",
        required: true
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

