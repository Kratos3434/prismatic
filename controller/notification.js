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
    await prisma.notification.deleteMany({});
    res.status(200).json({ status: true, msg: "All notifications deleted successfully" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.getByRecipientId = async (req, res) => {
  const { recipientId } = req.params;
  try {
    if (!recipientId) throw "Recipient Id is missing";
    if (!+recipientId) throw "Recipient Id must be a valid number";

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: +recipientId
      },
      include: {
        sender: true
      }
    });
    
    res.status(200).json({ status: true, data: notifications });
  } catch (err) {
    console.log(`Error: ${err}`)
    res.status(400).json({ status: false, error: err });
  }
}