const mongoose      = require("mongoose");
const messageModel  = require("../models/messageModel");
const userModel     = require("../models/userModel");

exports.sendMessage = async (req, res) => {
    try {
        let senderId   = req.headers._id;
        let senderRole = req.headers.role;
        let { propertyId, itemId, receiverId, message } = req.body;

        const allowedRoles = ["tenant", "landlord", "marketplace", "admin"];
        if (!allowedRoles.includes(senderRole))
            return res.status(403).json({ success: false, message: "You are not allowed to send messages." });

        let receiver = await userModel.findById(receiverId);
        if (!receiver)
            return res.status(404).json({ success: false, message: "Receiver not found." });

        let data = await messageModel.create({
            property: propertyId || null,
            item:     itemId     || null,
            sender:   senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({ success: true, message: "Message sent successfully", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.getConversation = async (req, res) => {
    try {
        let userId = req.headers._id;
        let { propertyId, otherUserId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(propertyId) || !mongoose.Types.ObjectId.isValid(otherUserId))
            return res.status(400).json({ success: false, message: "Invalid ID(s)" });

        let data = await messageModel.aggregate([
            {
                $match: {
                    property: new mongoose.Types.ObjectId(propertyId),
                    $or: [
                        { sender: new mongoose.Types.ObjectId(userId),      receiver: new mongoose.Types.ObjectId(otherUserId) },
                        { sender: new mongoose.Types.ObjectId(otherUserId), receiver: new mongoose.Types.ObjectId(userId) }
                    ]
                }
            },
            { $lookup: { from: "users", localField: "sender",   foreignField: "_id", as: "senderInfo" } },
            { $lookup: { from: "users", localField: "receiver", foreignField: "_id", as: "receiverInfo" } },
            { $project: { "senderInfo.password": 0, "receiverInfo.password": 0 } },
            { $sort: { createdAt: 1 } }
        ]);

        await messageModel.updateMany(
            { property: new mongoose.Types.ObjectId(propertyId), receiver: new mongoose.Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "Conversation retrieved", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.getItemConversation = async (req, res) => {
    try {
        let userId = req.headers._id;
        let { itemId, otherUserId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(otherUserId))
            return res.status(400).json({ success: false, message: "Invalid ID(s)" });

        let data = await messageModel.aggregate([
            {
                $match: {
                    item: new mongoose.Types.ObjectId(itemId),
                    $or: [
                        { sender: new mongoose.Types.ObjectId(userId),      receiver: new mongoose.Types.ObjectId(otherUserId) },
                        { sender: new mongoose.Types.ObjectId(otherUserId), receiver: new mongoose.Types.ObjectId(userId) }
                    ]
                }
            },
            { $lookup: { from: "users", localField: "sender",   foreignField: "_id", as: "senderInfo" } },
            { $lookup: { from: "users", localField: "receiver", foreignField: "_id", as: "receiverInfo" } },
            { $project: { "senderInfo.password": 0, "receiverInfo.password": 0 } },
            { $sort: { createdAt: 1 } }
        ]);

        await messageModel.updateMany(
            { item: new mongoose.Types.ObjectId(itemId), receiver: new mongoose.Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "Conversation retrieved", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.myTenants = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can access this." });

        let landlordId = req.headers._id;

        let data = await messageModel.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId(landlordId), property: { $ne: null } } },
            { $group: { _id: { property: "$property", tenant: "$sender" } } },
            { $lookup: { from: "properties", localField: "_id.property", foreignField: "_id", as: "propertyInfo" } },
            { $lookup: { from: "users",      localField: "_id.tenant",   foreignField: "_id", as: "tenantInfo" } },
            {
                $project: {
                    propertyId:   "$_id.property",
                    tenantId:     "$_id.tenant",
                    propertyArea: { $arrayElemAt: ["$propertyInfo.area",         0] },
                    propertyType: { $arrayElemAt: ["$propertyInfo.propertyType", 0] },
                    monthlyRent:  { $arrayElemAt: ["$propertyInfo.monthlyRent",  0] },
                    tenantName:   { $arrayElemAt: ["$tenantInfo.name",           0] },
                    tenantEmail:  { $arrayElemAt: ["$tenantInfo.email",          0] },
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ success: true, message: "Tenants retrieved", data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.broadcastMessage = async (req, res) => {
    try {
        const adminId = req.headers._id;
        if (req.headers.role !== "admin")
            return res.status(403).json({ success: false, message: "Only admin can broadcast messages." });

        const { message, targetRole } = req.body;
        if (!message || !message.trim())
            return res.status(400).json({ success: false, message: "Message text is required." });

        const query = { _id: { $ne: adminId } };
        if (targetRole) query.role = targetRole;

        const users = await userModel.find(query).select("_id").lean();
        if (users.length === 0)
            return res.status(404).json({ success: false, message: "No users found for that role." });

        const docs = users.map(u => ({
            property: null, item: null, sender: adminId,
            receiver: u._id, message: message.trim(), isRead: false
        }));
        await messageModel.insertMany(docs);

        res.status(200).json({ success: true, message: `Broadcast sent to ${docs.length} user(s).`, count: docs.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};

exports.inbox = async (req, res) => {
    try {
        const Property    = require("../models/propertyModel");
        const Marketplace = require("../models/marketplaceModel");

        let userId = new mongoose.Types.ObjectId(req.headers._id);

        let allMessages = await messageModel.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 }).lean();

        const threadMap = new Map();
        for (let msg of allMessages) {
            let otherId = msg.sender.equals(userId) ? msg.receiver : msg.sender;
            let context = msg.property
                ? `property:${msg.property}:${otherId}`
                : `item:${msg.item}:${otherId}`;

            if (!threadMap.has(context)) {
                threadMap.set(context, {
                    contextType: msg.property ? "property" : "item",
                    contextId:   msg.property || msg.item,
                    otherId,
                    lastMessage: msg.message,
                    lastDate:    msg.createdAt,
                    unreadCount: 0
                });
            }
            if (!msg.sender.equals(userId) && !msg.isRead)
                threadMap.get(context).unreadCount++;
        }

        const threads = [...threadMap.values()];
        if (threads.length === 0)
            return res.status(200).json({ success: true, message: "Inbox retrieved", data: [] });

        const otherUserIds  = [...new Set(threads.map(t => String(t.otherId)))];
        const otherUsersArr = await userModel.find({ _id: { $in: otherUserIds } }).select("name email role").lean();
        const userMap = new Map(otherUsersArr.map(u => [String(u._id), u]));

        const propIds  = threads.filter(t => t.contextType === "property").map(t => t.contextId);
        const propsArr = propIds.length
            ? await Property.find({ _id: { $in: propIds } }).select("area address propertyType monthlyRent").lean()
            : [];
        const propMap = new Map(propsArr.map(p => [String(p._id), p]));

        const itemIds  = threads.filter(t => t.contextType === "item").map(t => t.contextId);
        const itemsArr = itemIds.length
            ? await Marketplace.find({ _id: { $in: itemIds } }).select("title price images").lean()
            : [];
        const itemMap = new Map(itemsArr.map(i => [String(i._id), i]));

        const result = threads.map(thread => ({
            contextType: thread.contextType,
            contextId:   String(thread.contextId),
            otherId:     String(thread.otherId),
            otherUser:   userMap.get(String(thread.otherId)) || null,
            contextInfo: thread.contextType === "property"
                ? propMap.get(String(thread.contextId)) || null
                : itemMap.get(String(thread.contextId)) || null,
            lastMessage: thread.lastMessage,
            lastDate:    thread.lastDate,
            unreadCount: thread.unreadCount
        }));

        result.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

        res.status(200).json({ success: true, message: "Inbox retrieved", data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.toString(), message: e.message });
    }
};
