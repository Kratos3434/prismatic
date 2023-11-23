const { Request, Response, NextFunction } = require('express');
const jwt = require("jsonwebtoken");
const fs = require('fs');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
module.exports.admin = async (req, res, next) => {
  try {
    if(!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(' ')[1];
    if(bearerToken != process.env.ADMIN_TOKEN) {
      throw "Unauthorized";
    } else {
      next();
    }
  } catch (err) {
    res.status(401).json({ status: false, error: err });
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
module.exports.user = async (req, res, next) => {
  try {
    if(!req.cookies.token) {
      throw "Unauthorized or Expired";
    }
    if(!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(' ')[1];
    if(bearerToken != req.cookies.token) {
      throw "Unauthorized";
    }
    next();
  } catch (err) {
    res.status(401).json({status: false, error: err});
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
module.exports.authUser = (req, res, next) => {
  try {
    if(!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(' ')[1];

    if(bearerToken == "undefined") throw "Unauthorized";
    const privateKey = fs.readFileSync(`${__dirname}/privateKey.key`);
    const result = jwt.verify(bearerToken, privateKey);
    if(!result) throw "Unauthorized";
    next();
  } catch (err) {
    console.log(err)
    res.status(401).json({status: false, error: err});
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
module.exports.authOtp = async (req, res, next) => {
  try {
    if(!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(' ')[1];

    if(bearerToken == "undefined" || !bearerToken) throw "Unauthorized";

    const tempUser = await prisma.temporaryUser.findUnique({
      where: {
        retrieveToken: bearerToken,
      }
    })

    if(!tempUser) throw "Unauthorized";

    next();
  } catch (err) {
    res.status(401).json({status: false, error: err});
  }
}