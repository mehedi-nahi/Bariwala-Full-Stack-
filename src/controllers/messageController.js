const mongoose      = require("mongoose");
const messageModel  = require("../models/messageModel");
const userModel     = require("../models/userModel");
const propertyModel = require("../models/propertyModel");
const marketplaceModel = require("../models/marketplaceModel");
const { sendError } = require("../utility/errorUtility");
const { isId }      = require("../utility/validators");

const MAX_MESSAGE = 1000;
const oid = (v) => new mongoose.Types.ObjectId(v);

const withParticipants = [
    { $lookup: { from: "users", localField: "sender",   foreignField: "_id", as: "senderInfo" } },
    { $lookup: { from: "users", localField: "receiver", foreignField: "_id", as: "receiverInfo" } },
    { $project: {
        "senderInfo.password": 0, "senderInfo.email": 0, "senderInfo.phone": 0,
        "receiverInfo.password": 0, "receiverInfo.email": 0, "receiverInfo.phone": 0
    } },
    { $sort: { createdAt: 1 } }
];

exports.sendMessage = async (req, res) => {
    try {
        let senderId   = req.headers._id;
        let senderRole = req.headers.role;
        let { propertyId, itemId, receiverId, message } = req.body;

        const allowedRoles = ["tenant", "landlord", "marketplace", "admin"];
        if (!allowedRoles.includes(senderRole))
            return res.status(403).json({ success: false, message: "You are not allowed to send messages." });

        message = typeof message === "string" ? message.trim() : "";
        if (!message)
            return res.status(400).json({ success: false, message: "Message cannot be empty." });
        if (message.length > MAX_MESSAGE)
            return res.status(400).json({ success: false, message: `Message can be at most ${MAX_MESSAGE} characters.` });
        if (!isId(receiverId))
            return res.status(400).json({ success: false, message: "Invalid receiver." });
        if (String(receiverId) === String(senderId))
            return res.status(400).json({ success: false, message: "You cannot message yourself." });
        if (propertyId && itemId)
            return res.status(400).json({ success: false, message: "A message can belong to a property or an item, not both." });

        let receiver = await userModel.findById(receiverId).select("isBlocked");
        if (!receiver || receiver.isBlocked)
            return res.status(404).json({ success: false, message: "Receiver not found." });

        // A conversation about a listing must involve the person who owns that listing.
        if (propertyId) {
            if (!isId(propertyId)) return res.status(400).json({ success: false, message: "Invalid property." });
            const property = await propertyModel.findById(propertyId).select("landlord").lean();
            if (!property) return res.status(404).json({ success: false, message: "Property not found." });
            const owner = String(property.landlord);
            if (owner !== String(senderId) && owner !== String(receiverId) && senderRole !== "admin")
                return res.status(403).json({ success: false, message: "You can only message the landlord of this property." });
        }
        if (itemId) {
            if (!isId(itemId)) return res.status(400).json({ success: false, message: "Invalid item." });
            const item = await marketplaceModel.findById(itemId).select("seller").lean();
            if (!item) return res.status(404).json({ success: false, message: "Item not found." });
            const owner = String(item.seller);
            if (owner !== String(senderId) && owner !== String(receiverId) && senderRole !== "admin")
                return res.status(403).json({ success: false, message: "You can only message the seller of this item." });
        }

        let data = await messageModel.create({
            property: propertyId || null,
            item:     itemId     || null,
            sender:   senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({ success: true, message: "Message sent successfully", data });
    } catch (e) {
        sendError(res, e);
    }
};

// Shared implementation for the three conversation endpoints.
const loadConversation = async (req, res, contextFilter, markReadFilter) => {
    try {
        const userId = req.headers._id;
        const { otherUserId } = req.params;
        if (!isId(otherUserId))
            return res.status(400).json({ success: false, message: "Invalid ID(s)" });

        const me = oid(userId), other = oid(otherUserId);

        const data = await messageModel.aggregate([
            {
                $match: {
                    ...contextFilter,
                    $or: [
                        { sender: me,    receiver: other },
                        { sender: other, receiver: me }
                    ]
                }
            },
            ...withParticipants
        ]);

        // only mark messages from THIS person in THIS conversation as read
        await messageModel.updateMany(
            { ...markReadFilter, sender: other, receiver: me, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, message: "Conversation retrieved", data });
    } catch (e) {
        sendError(res, e);
    }
};

exports.getConversation = (req, res) => {
    const { propertyId } = req.params;
    if (!isId(propertyId)) return res.status(400).json({ success: false, message: "Invalid ID(s)" });
    const f = { property: oid(propertyId) };
    return loadConversation(req, res, f, f);
};

exports.getItemConversation = (req, res) => {
    const { itemId } = req.params;
    if (!isId(itemId)) return res.status(400).json({ success: false, message: "Invalid ID(s)" });
    const f = { item: oid(itemId) };
    return loadConversation(req, res, f, f);
};

// Direct messages that belong to no listing (admin announcements and replies to them).
exports.getDirectConversation = (req, res) => {
    const f = { property: null, item: null };
    return loadConversation(req, res, f, f);
};

exports.unreadCount = async (req, res) => {
    try {
        const count = await messageModel.countDocuments({ receiver: req.headers._id, isRead: false });
        res.status(200).json({ success: true, count });
    } catch (e) {
        sendError(res, e);
    }
};

exports.myTenants = async (req, res) => {
    try {
        if (req.headers.role !== "landlord")
            return res.status(403).json({ success: false, message: "Only landlords can access this." });

        let landlordId = req.headers._id;

        let data = await messageModel.aggregate([
            { $match: { receiver: oid(landlordId), property: { $ne: null } } },
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
        sendError(res, e);
    }
};

exports.broadcastMessage = async (req, res) => {
    try {
        const adminId = req.headers._id;
        if (req.headers.role !== "admin")
            return res.status(403).json({ success: false, message: "Only admin can broadcast messages." });

        const { message, targetRole } = req.body;
        if (typeof message !== "string" || !message.trim())
            return res.status(400).json({ success: false, message: "Message text is required." });
        if (message.trim().length > 500)
            return res.status(400).json({ success: false, message: "Announcements can be at most 500 characters." });
        if (targetRole && !["tenant", "landlord", "marketplace"].includes(targetRole))
            return res.status(400).json({ success: false, message: "Invalid target audience." });

        const query = { _id: { $ne: adminId }, isBlocked: false };
        if (targetRole) query.role = targetRole;

        const users = await userModel.find(query).select("_id").lean();
        if (users.length === 0)
            return res.status(404).json({ success: false, message: "No users found for that audience." });

        const docs = users.map(u => ({
            property: null, item: null, sender: adminId,
            receiver: u._id, message: message.trim(), isRead: false
        }));
        await messageModel.insertMany(docs);

        res.status(200).json({ success: true, message: `Announcement sent to ${docs.length} user(s).`, count: docs.length });
    } catch (e) {
        sendError(res, e);
    }
};

exports.inbox = async (req, res) => {
    try {
        let userId = oid(req.headers._id);

        let allMessages = await messageModel.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 }).limit(2000).lean();

        const threadMap = new Map();
        for (let msg of allMessages) {
            let otherId = msg.sender.equals(userId) ? msg.receiver : msg.sender;
            const contextType = msg.property ? "property" : msg.item ? "item" : "direct";
            const contextId   = msg.property || msg.item || null;
            const key = `${contextType}:${contextId}:${otherId}`;

            if (!threadMap.has(key)) {
                threadMap.set(key, {
                    contextType, contextId, otherId,
                    lastMessage: msg.message,
                    lastDate:    msg.createdAt,
                    lastFromMe:  msg.sender.equals(userId),
                    unreadCount: 0
                });
            }
            if (!msg.sender.equals(userId) && !msg.isRead)
                threadMap.get(key).unreadCount++;
        }

        const threads = [...threadMap.values()];
        if (threads.length === 0)
            return res.status(200).json({ success: true, message: "Inbox retrieved", data: [] });

        const otherUserIds  = [...new Set(threads.map(t => String(t.otherId)))];
        const otherUsersArr = await userModel.find({ _id: { $in: otherUserIds } }).select("name role").lean();
        const userMap = new Map(otherUsersArr.map(u => [String(u._id), u]));

        const propIds  = threads.filter(t => t.contextType === "property").map(t => t.contextId);
        const propsArr = propIds.length
            ? await propertyModel.find({ _id: { $in: propIds } }).select("area address propertyType monthlyRent availability").lean()
            : [];
        const propMap = new Map(propsArr.map(p => [String(p._id), p]));

        const itemIds  = threads.filter(t => t.contextType === "item").map(t => t.contextId);
        const itemsArr = itemIds.length
            ? await marketplaceModel.find({ _id: { $in: itemIds } }).select("title price images condition").lean()
            : [];
        const itemMap = new Map(itemsArr.map(i => [String(i._id), i]));

        const result = threads.map(thread => ({
            contextType: thread.contextType,
            contextId:   thread.contextId ? String(thread.contextId) : "",
            otherId:     String(thread.otherId),
            otherUser:   userMap.get(String(thread.otherId)) || null,
            contextInfo: thread.contextType === "property"
                ? propMap.get(String(thread.contextId)) || null
                : thread.contextType === "item"
                    ? itemMap.get(String(thread.contextId)) || null
                    : null,
            lastMessage: thread.lastMessage,
            lastDate:    thread.lastDate,
            lastFromMe:  thread.lastFromMe,
            unreadCount: thread.unreadCount
        }));

        result.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

        res.status(200).json({ success: true, message: "Inbox retrieved", data: result });
    } catch (e) {
        sendError(res, e);
    }
};
