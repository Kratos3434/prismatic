const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Request, Response } = require('express');
const bcrypt = require('bcryptjs');
const Otp = require('../mongoose/schema/otp');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.list = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json({status: true, data: users});
    } catch (err) {
        console.log(err);
        res.status(400).json({status: false, error: err});
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.signup = async (req, res) => {
    const { firstName, lastName, email, password, password2, gender, otp } = req.body;
    try {
        if(!otp) throw "OTP is required";
        if(!firstName) throw "First Name is required";
        if(!lastName) throw "Last Name is required";
        if(!email) throw "Email is required";
        if(!password) throw "Password is required";
        if(!password2) throw "Please confirm your password";
        if(password != password2) throw "Passwords do not match";
        if(!gender) throw "Your gender is required";
        
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email
                }
            }
        })

        if(user) throw "This email has already taken";

        const OTP = await Otp.findOne({email, otp});
        if(!OTP) throw "Invalid OTP";

        const hash = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hash,
                gender
            }
        });
        res.status(200).json({status: true, msg: "Signup successful"})
    } catch (err) {
        res.status(400).json({status: false, error: err});
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.signin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if(!email) throw "Email is required";
        if(!password) throw "Password is required";

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email
                }
            }
        });

        if(!user) throw "Invalid email or password";

        const result = await bcrypt.compare(password, user.password);
        if(!result) throw "Invalid email or password";

        res.status(200).json({status: true, data: user });
    } catch (err) {
        res.status(400).json({status: false, error: err });
    }
}
