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
        comments: {
          include: {
            author: true
          }
        },
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

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.getByCurrentMonth = async (req, res) => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  try {
    const posts = await prisma.post.findMany({
      where: {
        createdAt: {
          lte: new Date(lastDay.toISOString().split('T')[0]),
          gte: new Date(firstDay.toISOString().split('T')[0])
        }
      }
    })

    res.status(200).json({ status: true, data: posts });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.getByCurrentWeek = async (req, res) => {
  function getMonday(d) {
    d = new Date(d);
    const day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }
  function endOfWeek(date)
  {
     
    var lastday = date.getDate() - (date.getDay() - 1) + 6;
    return new Date(date.setDate(lastday));
 
  }
  try {
    const posts = await prisma.post.findMany({
      where: {
        createdAt: {
          lte: new Date(getMonday(new Date()).toISOString().split('T')[0]),
          gte: new Date(endOfWeek(new Date()).toISOString().split('T')[0])
        }
      }
    })
    
    res.status(200).json({ status: true, data: posts });
  } catch (err) {
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
