const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer .createTransport({
    host:"smtp.gmail.com",
    port: 587,
    secure: false,
    auth:{
        user: process.env.Email_user,
        pass: process.env.Email_pass

    },
});

module.exports = transporter