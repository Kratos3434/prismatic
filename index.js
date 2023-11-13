const HTT_PORT = process.env.PORT || 8080;
const express = require('express');
const app = express();
const userRoute = require('./routes/user');
const mongo = require('./mongoHelper');

require('dotenv').config();

app.use(express.json());

app.use("/user", userRoute);

app.get("/", (req, res) => {
    res.send("Hello, Dad");
})

mongo.connect().then(() => {
    app.listen(HTT_PORT, () => {
        console.log(`Express server listening on port ${HTT_PORT}`);
    })
})