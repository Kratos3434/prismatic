const { Request, Response } = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.deleteAll = async (req, res) => {
  try {
    await prisma.friendRequest.deleteMany({});
    res.status(200).json({ status: true, msg: "All friend requests have been deleted" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
}