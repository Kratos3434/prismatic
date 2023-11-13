const express = require('express');
const router = express.Router();
const user = require('../controller/user');
const otp = require('../controller/otp');

router.get("/list", user.list);
router.post("/signup", user.signup);
router.post("/signin", user.signin);
router.post("/send/otp", otp.sendOtp);

module.exports = router;