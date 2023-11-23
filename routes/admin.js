const express = require('express');
const router = express.Router();
const auth = require('../auth');
const user = require('../controller/user');
const post = require('../controller/post');
const address = require('../controller/address');
const comment = require('../controller/comment');

router.get("/user/list", auth.admin, user.list);
router.get('/post/list', auth.admin, post.list);
router.get("/address/list", auth.admin, address.list);
router.get("/user/authenticate", auth.authUser, (req, res) => {
    res.status(200).json({status: true, msg: "Authenticated user"});
});
router.get("/user/validating/:retrieveToken", auth.admin, user.getValidatingUser);
router.delete("/delete/posts", auth.admin, post.deleteAll);
router.delete("/delete/addresses", auth.admin, address.deleteAll);
router.delete("/delete/users", auth.admin, user.deleteAll);
router.delete("/delete/comments", comment.deleteAll);

module.exports = router;