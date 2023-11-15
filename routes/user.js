const express = require('express');
const router = express.Router();
const auth = require('../auth');
const user = require('../controller/user');
const address = require('../controller/address');
const multer = require('multer');
const upload = multer();

router.post("/add/address", auth.user, user.addAddress);
router.patch("/update/address", auth.user, address.update);
router.patch("/update/phone", auth.user, user.updatePhone);
router.post("/add/post", auth.user, upload.single("featureImage"), user.addPost);

router.delete('/delete/post', auth.user, user.deletePost);
router.post("/add/comment", auth.user, user.addCommentToPost);
router.put("/like/post", auth.user, user.likePost);
router.patch("/change/password", auth.user, user.changePassword);

module.exports = router;