const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const otpSchema = new Schema({
    otp: { type: String, required: true },
    email: { type: String, required: true },
    createdAt: {
        type: Date,
        expires: '5m',
        default: Date.now
    }
});

module.exports = Otp = mongoose.model("otp", otpSchema);