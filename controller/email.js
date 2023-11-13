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