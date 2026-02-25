const mongoose      = require("mongoose");
const messageModel  = require("../models/messageModel");

// Send Message
exports.sendMessage = async (req, res) => {
    try {
        let senderId = req.headers._id;
        let { propertyId, receiverId, message } = req.body;

        let data = await messageModel.create({
            property: propertyId,
            sender:   senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({ success: true, message: "Message sent successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Get Conversation (between logged-in user & another user, for a specific property)
exports.getConversation = async (req, res) => {
    try {
        let userId      = req.headers._id;
        let { propertyId, otherUserId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(propertyId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
            return res.status(400).json({ success: false, message: "Invalid ID(s)" });
        }

        let matchStage = {
            $match: {
                property: new mongoose.Types.ObjectId(propertyId),
                $or: [
                    { sender: new mongoose.Types.ObjectId(userId),      receiver: new mongoose.Types.ObjectId(otherUserId) },
                    { sender: new mongoose.Types.ObjectId(otherUserId), receiver: new mongoose.Types.ObjectId(userId) }
                ]
            }
        };

        let joinSender = {
            $lookup: { from: "users", localField: "sender", foreignField: "_id", as: "senderInfo" }
        };

        let sortStage = { $sort: { createdAt: 1 } };

        let data = await messageModel.aggregate([matchStage, joinSender, sortStage]);

        // mark unread messages as read
        await messageModel.updateMany(
            { property: new mongoose.Types.ObjectId(propertyId), receiver: new mongoose.Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "Conversation retrieved", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

// Inbox — distinct threads for the logged-in user
exports.inbox = async (req, res) => {
    try {
        let userId = req.headers._id;

        let matchStage = {
            $match: {
                $or: [
                    { sender:   new mongoose.Types.ObjectId(userId) },
                    { receiver: new mongoose.Types.ObjectId(userId) }
                ]
            }
        };

        let sortStage = { $sort: { createdAt: -1 } };

        // group by property + otherUser to get distinct threads
        let groupStage = {
            $group: {
                _id: { property: "$property" },
                lastMessage: { $first: "$message" },
                lastDate:    { $first: "$createdAt" },
                sender:      { $first: "$sender" },
                receiver:    { $first: "$receiver" }
            }
        };

        let joinProperty = {
            $lookup: { from: "properties", localField: "_id.property", foreignField: "_id", as: "propertyInfo" }
        };

        let data = await messageModel.aggregate([matchStage, sortStage, groupStage, joinProperty]);

        res.status(200).json({ success: true, message: "Inbox retrieved", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

