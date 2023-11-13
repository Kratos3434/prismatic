const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Request, Response } = require('express');
const bcrypt = require('bcryptjs');
const Otp = require('../mongoose/schema/otp');
const jwt = require('jsonwebtoken');

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.list = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                address: true, posts: true
            }
        });
        res.status(200).json({status: true, data: users});
    } catch (err) {
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
        const token = jwt.sign(user, 'fdfdfvdfdfwfgrfgasfds', { expiresIn: '1d' });
        res.cookie("token", token, {httpOnly: false, maxAge: 24 * 60 * 60 * 1000});

        res.status(200).json({status: true, data: token });
    } catch (err) {
        console.log(err)
        res.status(400).json({status: false, error: err });
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.addAddress = async (req, res) => {
    const { email, addressLine1, addressLine2, postalCode, province, country } = req.body;
    try {
        if(!email) throw "Email is required";
        if(!addressLine1) throw "Address Line 1 is required";
        if(!postalCode) throw "Postal Code is required";
        if(!province) throw "Province is required";
        if(!country) throw "Country is required";

        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });
        if(!user) throw "This user does not exist";

        const newAddress = await prisma.address.create({
            data: {
                addressLine1,
                addressLine2: addressLine2 ? addressLine2 : null,
                postalCode,
                province,
                country,
                user: {
                    connect: {
                        id: user.id
                    }
                }
            }
        });

        res.status(200).json({status: true, data: newAddress});
    } catch (err) {
        if(err.code && err.code == "P2014") {
            return res.status(400).json({status: false, error: "You already have an address"})
        }
        res.status(400).json({status: false, error: err});
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.updatePhone = async (req, res) => {
    const { email, phone } = req.body;
    try {
        if(!email) throw "Email is requried";
        if(!phone) throw "Phone is required";
        const pattern = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
        if(!pattern.test(phone)) throw "Please enter a valid phone number";

        const updated = await prisma.user.update({
            where: {email},
            data: {phone}
        });

        res.status(200).json({status: true, msg: "Phone updated successfully", data: updated});
    } catch (err) {
        res.status(400).json({status: false, error: err});
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.addPost = async (req, res) => {
    const { email, featureImage, description } = req.body;
    try {
        if(!email) throw "Email is required";
        if(!featureImage) throw "Image is required";
        if(!description) throw "Description is required";

        const user = await prisma.user.findUnique({
            where: {email}
        });

        if(!user) throw "This user does not exist";

        const newPost = await prisma.post.create({
            data: {
                featureImage,
                description,
                author: {
                    connect: {
                        id: user.id
                    }
                }
            }
        });

        res.status(200).json({status: true, data: newPost, msg: "Post successfully added"});
    } catch (err) {
        res.status(400).json({status: false, error: err});
    }
}