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
router.patch("/update/profilepicture", auth.user, upload.single('profilepicture'), user.changeProfilePic);
router.patch("/update/coverpicture", auth.user, upload.single('coverpicture'), user.changeCoverPhoto);
router.get("/current", auth.user, user.getCurrentUser);
router.patch("/update/bio", auth.user, user.updateBio);
router.get("/validate/current/:name", auth.user, user.validateProfile);
router.delete("/delete/post", auth.user, user.deletePostById);

module.exports = router;