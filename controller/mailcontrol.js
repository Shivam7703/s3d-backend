const resend = require("../config/mailer");

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
    text: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Message:</b> ${message}</p>`
};

    try {
        const info = await resend.emails.send(mailoptions);
        return res.status(200).json({ success: true, message: "message sent  Successfully" })

    } catch (err) {
    console.error("Err while sending mail", err);
    return res.status(500).json({ success: false, message: "Failed to send email" }); 
}
}

module.exports = { sendFormMail }