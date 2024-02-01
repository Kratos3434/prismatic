const express = require('express');
const router = express.Router();
const auth = require('../auth');
const user = require('../controller/user');
const post = require('../controller/post');
const address = require('../controller/address');
const comment = require('../controller/comment');
const like = require('../controller/like');
const notification = require('../controller/notification');

router.get("/user/list", auth.admin, user.list);
router.get('/post/list', post.list);
router.get("/address/list", auth.admin, address.list);
router.get("/user/authenticate", auth.authUser, (req, res) => {
    res.status(200).json({status: true, msg: "Authenticated user"});
});
router.get("/user/validating/:retrieveToken", auth.admin, user.getValidatingUser);
router.get("/unverified/user/list", auth.admin, user.getUnverified);
router.get("/user/current/month/list", auth.admin, user.getByCurrentMonth);
router.get("/post/current/month/list", auth.admin, post.getByCurrentMonth);
router.get("/unverified/current/month/list", auth.admin, user.getUnverifiedByCurrentMonth);
router.get("/user/current/week/list", auth.admin, user.getByCurrentWeek);
router.get("/post/current/week/list", auth.admin, post.getByCurrentWeek);

//!Danger Zone!
router.delete("/delete/posts", auth.admin, post.deleteAll);
router.delete("/delete/addresses", auth.admin, address.deleteAll);
router.delete("/delete/users", auth.admin, user.deleteAll);
router.delete("/delete/comments", comment.deleteAll);
router.delete("/delete/likes", auth.admin, like.deleteAll);
router.delete("/delete/notifications", auth.admin, notification.deleteAll);

module.exports = router;