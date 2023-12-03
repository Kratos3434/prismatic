const express = require('express');
const router = express.Router();
const user = require('../../controller/user');
const otp = require('../../controller/otp');
const auth = require('../../auth');

router.post("/signup", user.signup);
router.post("/signin", user.signin);
router.post("/send/otp", otp.sendOtp);
router.get("/forgot/link/:email", user.sendResetPasswordLink);
router.get("/token/verify/:token", user.verifyResetToken);
router.post("/forgot/password", user.forgotPassword);
router.post("/resend/otp/:email", auth.authOtp, otp.resend);
router.get("/user/:name", user.getByName);

module.exports = router;