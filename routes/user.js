const express = require('express');
const router = express.Router();
const auth = require('../auth');
const user = require('../controller/user');
const address = require('../controller/address');

router.post("/add/address", auth.user, user.addAddress);
router.patch("/update/address", auth.user, address.update);
router.patch("/update/phone", auth.user, user.updatePhone);
router.post("/add/post", auth.user, user.addPost);

module.exports = router;