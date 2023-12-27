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
    const addresses = await prisma.address.findMany();
    res.status(200).json({status: true, data: addresses});
  } catch (err) {
    res.status(400).json({status: false, error: err});
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.update = async (req, res) => {
  const { email, addressLine1, addressLine2, postalCode, province, country } = req.body;
  try {
    if(!email) throw "Email is required";
    if(!addressLine1) throw "Address Line 1 is required";
    if(!postalCode) throw "Postal Code is required";
    if(!province) throw "Province is required";
    if(!country) throw "Country is required";

    const user = await prisma.user.findUnique({
      where: {email}
    });

    if(!user) throw "This user does not exist";

    await prisma.address.update({
      where: {userId: user.id},
      data: {
        addressLine1,
        addressLine2: addressLine2 ? addressLine2 : null,
        postalCode,
        province,
        country
      }
    });

    res.status(200).json({status: true, msg: "Address changed successfully"});
  } catch (err) {
    res.status(400).json({status: false, error: err});
  }
}


//!WARNING this is only for testing and should not be inproduction
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.deleteAll = async (req, res) => {
  try {
    await prisma.address.deleteMany({});
    res.status(200).json({status: true, msg: "All address successfully deleted"});
  } catch (err) {
    res.status(400).json({status: false, error: err});
  }
}