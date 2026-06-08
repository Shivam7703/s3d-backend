const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 587,
    secure: false,
    auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY
    },
});

module.exports = transporter