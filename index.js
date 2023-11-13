const HTT_PORT = process.env.PORT || 8080;
const express = require("express");
const app = express();
const mongo = require("./mongoHelper");
const cookieParser = require("cookie-parser");
const cors = require('cors');
require("dotenv").config();

//route imports
const publicRoute = require("./routes/public/user");
const adminRoute = require("./routes/admin");
const userRoute = require('./routes/user');

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded(true))
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use("/public", publicRoute);
app.use("/admin", adminRoute);
app.use("/user", userRoute);

app.get("/", (req, res) => {
  res.send("Hello, Dad");
});

mongo.connect().then(() => {
  app.listen(HTT_PORT, () => {
    console.log(`Express server listening on port ${HTT_PORT}`);
  });
});
