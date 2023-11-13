const mongoose = require('mongoose');

module.exports.connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connection successful");
    } catch (err) {
        console.log("Something went wrong:", err);
    }
}