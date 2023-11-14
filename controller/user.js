const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Request, Response } = require("express");
const bcrypt = require("bcryptjs");
const Otp = require("../mongoose/schema/otp");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.list = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        address: true,
        posts: true,
        comments: true
      },
    });
    res.status(200).json({ status: true, data: users });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.signup = async (req, res) => {
  const { firstName, lastName, email, password, password2, gender, otp } =
    req.body;
  try {
    if (!otp) throw "OTP is required";
    if (!firstName) throw "First Name is required";
    if (!lastName) throw "Last Name is required";
    if (!email) throw "Email is required";
    if (!password) throw "Password is required";
    if (!password2) throw "Please confirm your password";
    if (password != password2) throw "Passwords do not match";
    if (!gender) throw "Your gender is required";

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
        },
      },
    });

    if (user) throw "This email has already been taken";

    const OTP = await Otp.findOne({ email, otp });
    if (!OTP) throw "Invalid OTP";

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hash,
        gender,
      },
    });
    res.status(200).json({ status: true, msg: "Signup successful" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email) throw "Email is required";
    if (!password) throw "Password is required";

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
        },
      },
    });

    if (!user) throw "Invalid email or password";

    const result = await bcrypt.compare(password, user.password);
    if (!result) throw "Invalid email or password";
    const token = jwt.sign(user, "fdfdfvdfdfwfgrfgasfds", { expiresIn: "1d" });
    res.cookie("token", token, {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: true, data: token });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.addAddress = async (req, res) => {
  const { email, addressLine1, addressLine2, postalCode, province, country } =
    req.body;
  try {
    if (!email) throw "Email is required";
    if (!addressLine1) throw "Address Line 1 is required";
    if (!postalCode) throw "Postal Code is required";
    if (!province) throw "Province is required";
    if (!country) throw "Country is required";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) throw "This user does not exist";

    const newAddress = await prisma.address.create({
      data: {
        addressLine1,
        addressLine2: addressLine2 ? addressLine2 : null,
        postalCode,
        province,
        country,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    res.status(200).json({ status: true, data: newAddress });
  } catch (err) {
    if (err.code && err.code == "P2014") {
      return res
        .status(400)
        .json({ status: false, error: "You already have an address" });
    }
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.updatePhone = async (req, res) => {
  const { email, phone } = req.body;
  try {
    if (!email) throw "Email is requried";
    if (!phone) throw "Phone is required";
    const pattern =
      /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
    if (!pattern.test(phone)) throw "Please enter a valid phone number";

    const updated = await prisma.user.update({
      where: { email },
      data: { phone },
    });

    res
      .status(200)
      .json({ status: true, msg: "Phone updated successfully", data: updated });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.addPost = async (req, res) => {
  const { email, description } = req.body;
  try {
    if (!email) throw "Email is required";
    if (!description) throw "Description is required";

    const user = await prisma.user.findUnique({
        where: {email}
    });
    if(!user) throw "This user does not exist";

    if (req.file) {
      console.log("File:", req.file)
      const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const upload = async (req) => {
        try {
          const result = await streamUpload(req);
          return result;
        } catch (err) {
          console.log(err);
          throw err;
        }
      };

      upload(req).then((uploaded) => {
        if (!uploaded) {
          return res
            .status(400)
            .json({
              status: false,
              error: "Something went wrong while uploading",
            });
        }
        processPost(uploaded.url);
      });

      const processPost = async (imageUrl) => {
        const newPost = await prisma.post.create({
            data: {
                featureImage: imageUrl,
                description,
                author: {
                    connect: {
                        id: user.id
                    }
                }
            }
        });
        return res.status(200).json({status: true, data: newPost, msg: "Post successfully added"});
      };

    } else {
        return res.status(400).json({status: false, error: "Image is required"});
    }
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.deletePost = async (req, res) => {
    const { email, postId } = req.body;
    try {
        if(!email) throw "Email is requried";
        if(!postId) throw "Post Id is required";
        if(!+postId) throw "Post Id is not a valid number";

        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                posts: {
                    where: {
                        id: +postId
                    }
                }
            }
        });
        if(!user) throw "This user does not exist";
        if(user.posts.length == 0) throw "This post does not exist";

        await prisma.post.delete({
            where: {
                id: +postId
            }
        });

        res.status(200).json({status: true, msg: "Post successfully deleted"});
    } catch (err) {
        res.status(400).json({status: false, error: err});
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
module.exports.addCommentToPost = async (req, res) => {
    const { email, postId, comment } = req.body;
    try {
        if(!email) throw "Email is required";
        if(!postId) throw "Post Id is rquired";
        if(!+postId) throw "Post Id is not a valid number";
        if(!comment) throw "Comment is required";

        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                posts: {
                    where: {
                        id: +postId
                    }
                }
            }
        });

        if(!user) throw "This user does not exist";
        if(user.posts.length == 0) throw "This post does not exist";

        const newComment = await prisma.comment.create({
            data: {
                comment,
                authorId: user.id,
                postId: user.posts[0].id
            }
        });

        res.status(200).json({status: true, msg: "Comment successfully added", data: newComment});
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
module.exports.likePost = async (req, res) => {
    const { email, postId } = req.body;
    try {
        if(!email) throw "Email is required";
        if(!postId) throw "Post Id is required";
        if(!+postId) throw "Post Id is not a valid number";

        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if(!user) throw "This user does not exist";

        const post = await prisma.post.findUnique({
            where: {
                id: postId
            }
        });

        if(!post) throw "This post does not exist";

        await prisma.post.update({
            where: {
                id: post.id
            },
            data: {
                likes: post.likes += 1,
                updatedAt: new Date()
            }
        });

        res.status(200).json({status: true, msg: "Post liked successfully"});
    } catch (err) {
        console.log(err)
        res.status(400).json({status: false, error: err});
    }
}
//!WARNING this is only for testing and should not be in production
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.deleteAll = async (req, res) => {
  try {
    await prisma.user.deleteMany({});
    res
      .status(200)
      .json({ status: true, msg: "All users successfully deleted" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};
