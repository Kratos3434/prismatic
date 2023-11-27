const Otp = require('../mongoose/schema/otp')
const { Request, Response } = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('./email');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const otpGenrator = require('otp-generator');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.sendOtp = async (req, res) => {
    const { firstName, lastName, password, password2, email, gender } = req.body;
    try {
        if (!firstName) throw "First name is required";
        if (!lastName) throw "Last name is required";
        if (!email) throw "Email is required";
        if (!password) throw "Password is required";
        if (!password2) throw "Please confirm your password";
        if (password != password2) throw "Passwords do not match";
        if (!gender) throw "Gender is required";

        const otp = otpGenrator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

        console.log("EMAIL:", email);

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email
                }
            }
        })

        if (user) throw "This email has already been taken";

        const o = await Otp.findOne({ email });
        if (o) {
            o.otp = otp;
            await o.save();
        } else {
            const newOtp = new Otp({
                otp,
                email
            });

            await newOtp.save();
        }

        const hash = await bcrypt.hash(password, 10);

        const tempUser = await prisma.temporaryUser.findUnique({
            where: {
                email
            }
        });
        const retrieveToken = crypto.randomBytes(32).toString('hex');
        if (tempUser) {
            await prisma.temporaryUser.update({
                where: {
                    email
                },
                data: {
                    firstName,
                    lastName,
                    password: hash,
                    gender,
                    retrieveToken
                }
            })
        } else {
            await prisma.temporaryUser.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: hash,
                    gender,
                    retrieveToken
                }
            })
        }
        await emailService.send("keithcarlos34@gmail.com", otp);
        console.log("Retrieve token:", retrieveToken);
        res.cookie("retrieveToken", retrieveToken, {
            httpOnly: false,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ status: true, data: otp });
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
module.exports.resend = async (req, res) => {
    const { email } = req.params;
    try {
        const tempUser = await prisma.temporaryUser.findUnique({
            where: {
                email
            }
        });

        if (!tempUser) throw "Invalid request";

        const o = await Otp.findOne({ email });
        console.log("OTP:", o);
        if (o) throw "Please check your email or spam for the otp";

        const otp = otpGenrator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

        const newOtp = new Otp({
            otp,
            email
        });

        await newOtp.save();
        await emailService.send("keithcarlos34@gmail.com", otp);

        res.status(200).json({ status: true, msg: "Otp successfully resent" });
    } catch (err) {
        res.status(400).json({ status: false, error: err });
    }
}