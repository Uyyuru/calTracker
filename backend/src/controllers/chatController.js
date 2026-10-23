const asyncHandler = require("../utils/asyncHandler");
const chatService = require("../services/chatService");

const create = asyncHandler(async (req, res) => {
  const chat = await chatService.createChat(req.user._id);
  res.status(201).json({ chat });
});

const list = asyncHandler(async (req, res) => {
  const result = await chatService.listChats(req.user._id, req.query);
  res.json(result);
});

const listMessages = asyncHandler(async (req, res) => {
  const messages = await chatService.listMessages(req.user._id, req.params.id);
  res.json({ messages });
});

const send = asyncHandler(async (req, res) => {
  const data = await chatService.sendMessage(req.user._id, req.params.id, req.body.content);
  res.json(data);
});

module.exports = { create, list, listMessages, send };
