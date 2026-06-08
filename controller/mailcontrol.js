const transporter = require("../config/mailer");

const sendFormMail = async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({
            success: false, message: "Fields Should not remains empty"
        })
    };

  const mailoptions = {
    from: "onboarding@resend.dev",  
    to: process.env.EMAIL_USER,
    subject: `New Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
};

    try {
        const info = await transporter.sendMail(mailoptions);
        return res.status(200).json({ success: true, message: "message sent  Successfully" })

    } catch (err) {
    console.error("Err while sending mail", err);
    return res.status(500).json({ success: false, message: "Failed to send email" }); 
}
}

module.exports = { sendFormMail }