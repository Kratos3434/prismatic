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
      orderBy: [
        {
          createdAt: 'desc'
        }
      ],
      include: {
        author: true,
        comments: true,
        likes: true
      }
    });
    res.status(200).json({status: true, data: posts});
  } catch (err) {
    console.log(err)
    res.status(400).json({status: false, error: err});
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) throw "ID is missing";
    if (!+id) throw "ID must be a valid number";

    const post = await prisma.post.findUnique({
      where: {
        id: +id
      },
      include: {
        likes: true
      }
    });

    if (!post) throw "This post does not exist";

    res.status(200).json({ status: true, data: post });
  } catch (err) {
    console.log(err)
    res.status(400).json({ status: false, error: err });
  }
}

//!Warning: This is for testing and should not be in production!!!//
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.deleteAll = async (req, res) => {
  try {
    await prisma.post.deleteMany({});
    res.status(200).json({status: true, msg: "All posts deleted successfully"});
  } catch (err) {
    res.status(400).json({status: false, error: err});
  }
}
