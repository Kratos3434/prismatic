const express = require('express');
const router = express.Router();
const auth = require('../auth');
const user = require('../controller/user');
const post = require('../controller/post');
const address = require('../controller/address');

router.get("/user/list", auth.admin, user.list);
router.get('/post/list', auth.admin, post.list);
router.get("/address/list", auth.admin, address.list);


module.exports = router;