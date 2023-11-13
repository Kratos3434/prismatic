const { Request, Response } = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.list = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: true
      }
    });
    res.status(200).json({status: true, data: posts});
  } catch (err) {
    res.status(400).json({status: false, error: err});
  }
}
