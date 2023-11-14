const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports.deleteAll = async (req, res) => {
  try {
    await prisma.comment.deleteMany({});
    res.status(200).json({status: true, msg: "All comment deleted"});
  } catch (err) {
    res.status(400).json({status:false, error: err});
  }
}