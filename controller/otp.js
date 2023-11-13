const Otp = require('../mongoose/schema/otp')
const { Request, Response } = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('./email');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.sendOtp = async (req, res) => {
    const { firstName, lastName, email, password, password2, gender } = req.body;
    try {
        if(!firstName) throw "First Name is required";
        if(!lastName) throw "Last Name is required";
        if(!email) throw "Email is required";
        if(!password) throw "Password is required";
        if(!password2) throw "Please confirm your password";
        if(password != password2) throw "Passwords do not match";
        if(!gender) throw "Your gender is required";
        const otp = "123444";

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email
                }
            }
        })

        if(user) throw "This email has already been taken";

        const o = await Otp.findOne({email});
        if(o) throw "ERROR: This email is already waiting for validation";

        const newOtp = new Otp({
            otp,
            email
        });

        await newOtp.save();
        await emailService.send("keithcarlos34@gmail.com", otp);
        res.status(200).json({status: true, data: newOtp});
    } catch (err) {
        res.status(400).json({status: false, error: err});
    }
}