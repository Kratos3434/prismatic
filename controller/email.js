const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'keithcarlos34@gmail.com',
        pass: process.env.MAIL_PASS
    }
});

module.exports.send = async (to, otp) => {
    try {
        const mailOptions = {
            from: 'keithcarlos34@gmail.com',
            to,
            subject: 'OTP Verification',
            text: `Here's your OTP: ${otp}. This will expire in 4-5 minutes`
        }

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.log(err);
    }
}

module.exports.sendLink = async (to, url) => {
    try {
        const mailOptions = {
            from: "keithcarlos34@gmail.com",
            to,
            subject: "Password Reset Link",
            text: `Here's your password reset link, ${url}.
                   It will expire in 5-6 minutes. If you didn't make this request, please ignore this message`
        }

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.log(err);
    }
}