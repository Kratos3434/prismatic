const { Request, Response, NextFunction } = require('express');

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