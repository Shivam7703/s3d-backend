const express = require("express");
const router = express.Router();
const {sendFormMail} = require("../controller/mailcontrol");


router.post('/submit-form' , sendFormMail);

module.exports = router;