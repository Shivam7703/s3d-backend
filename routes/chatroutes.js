const express = require("express");
const router = express.Router();
const { sendChatMessage } = require("../controller/chatcontroller");

router.post("/chat", sendChatMessage);

module.exports = router;