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
    await prisma.like.deleteMany({});
    res.status(200).json({ status: true, msg: "All likes deleted successfully" });
  } catch (err) {
    console.log(err)
    res.status(400).json({ status: false, error: err });
  }
}