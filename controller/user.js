const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Request, Response } = require("express");
const bcrypt = require("bcryptjs");
const Otp = require("../mongoose/schema/otp");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const crypto = require("crypto");
const fs = require("fs");
const { sendLink } = require("./email");

//const ResetToken = require('../mongoose/schema/resetToken');

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
        comments: true,
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
module.exports.deletePostById = async (req, res) => {
  const { email, postId } = req.body;
  try {
    if (!email) throw "Email is missing";
    if (!postId) throw "Post Id is required";
    if (!+postId) throw "Post Id must be a valid number";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        posts: {
          where: {
            id: +postId,
          },
        },
      },
    });

    if (!user) throw "This user does not exist";
    if (user.posts.length === 0) throw "This post does not exist";
    if (!user.posts[0]) throw "This post does not exist";

    const post = await prisma.post.delete({
      where: {
        id: +postId,
      },
    });

    await cloudinary.uploader.destroy(
      post.featureImage.substring(
        post.featureImage.lastIndexOf("/") + 1,
        post.featureImage.lastIndexOf(".")
      )
    );
    res.status(200).json({ status: true, msg: "Post deleted successfully" });
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
module.exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(" ")[1];

    if (bearerToken == "undefined") throw "Unauthorized";
    const privateKey = fs.readFileSync(`./privateKey.key`);
    const result = jwt.verify(bearerToken, privateKey);
    const currentUser = await prisma.user.findUnique({
      where: {
        email: result.email,
      },
    });
    if (!currentUser) throw "User not authenticated";

    res.status(200).json({ status: true, data: currentUser });
  } catch (err) {
    res.status(401).json({ status: false, error: err });
  }
};
/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.signup = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email) throw "Email is required";

    const tempUser = await prisma.temporaryUser.findUnique({
      where: {
        email,
      },
    });

    if (!tempUser) throw "Invalid request";

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
        },
      },
    });

    if (user) throw "This email has already been taken";

    const OTP = await Otp.findOne({ email, otp });
    if (!OTP) throw "This otp is invalid or expired";

    //const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        firstName: tempUser.firstName,
        lastName: tempUser.lastName,
        email: tempUser.email,
        password: tempUser.password,
        gender: tempUser.gender,
      },
    });

    await prisma.temporaryUser.delete({
      where: {
        email,
      },
    });

    res.status(200).json({ status: true, msg: "Signup successful" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

const prsimaExclude = (user, keys) => {
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !keys.includes(key))
  );
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
    const userNoPassword = prsimaExclude(user, ["password"]);
    console.log(process.env.JWT_SECRET);
    const privateKey = fs.readFileSync(`privateKey.key`);
    const token = jwt.sign(userNoPassword, privateKey, {
      expiresIn: "1d",
      algorithm: "RS256",
    });
    console.log("Sign token:", token);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
    });

    res.status(200).json({ status: true, data: userNoPassword });
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
module.exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ status: true, msg: "Logout successful" });
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
  const { description } = req.body;
  try {
    const bearerToken = req.headers.authorization.split(" ")[1];
    if (bearerToken === "undefined" || !bearerToken)
      throw "Invalid use of api, this incident will be reported";

    const privateKey = fs.readFileSync(`privateKey.key`);
    const { email } = jwt.verify(bearerToken, privateKey);
    if (!email) throw "Invalid use of api, this incident will be reported";
    if (!description) throw "Description is required";

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw "This user does not exist";

    if (req.file) {
      console.log("File:", req.file);
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
          return res.status(400).json({
            status: false,
            error: "Something went wrong while uploading",
          });
        }
        try {
          processPost(uploaded.url);
        } catch (err) {
          throw err;
        }
      });

      const processPost = async (imageUrl) => {
        const newPost = await prisma.post.create({
          data: {
            featureImage: imageUrl,
            description,
            author: {
              connect: {
                id: user.id,
              },
            },
          },
        });
        return res.status(200).json({
          status: true,
          data: newPost,
          msg: "Post successfully added",
        });
      };
    } else {
      const newPost = await prisma.post.create({
        data: {
          description,
          author: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      return res
        .status(200)
        .json({ status: true, data: newPost, msg: "Post successfully added" });
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
module.exports.changeProfilePic = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) throw "Email is required";

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw "This user does not exist";

    if (req.file) {
      console.log("File:", req.file);
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
          return res.status(400).json({
            status: false,
            error: "Something went wrong while uploading",
          });
        }
        processPost(uploaded.url);
      });

      const processPost = async (imageUrl) => {
        const result = await prisma.user.update({
          where: {
            email,
          },
          data: {
            profilePicture: imageUrl,
          },
        });

        return res.status(200).json({
          status: true,
          data: result,
          msg: "Pofile picture updated successfully",
        });
      };
    } else {
      return res
        .status(400)
        .json({ status: false, error: "Image is required" });
    }
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

module.exports.changeCoverPhoto = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) throw "Email is required";

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw "This user does not exist";

    if (req.file) {
      console.log("File:", req.file);
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
          return res.status(400).json({
            status: false,
            error: "Something went wrong while uploading",
          });
        }
        processPost(uploaded.url);
      });

      const processPost = async (imageUrl) => {
        const result = await prisma.user.update({
          where: {
            email,
          },
          data: {
            coverPicture: imageUrl,
          },
        });

        return res.status(200).json({
          status: true,
          data: result,
          msg: "Cover picture updated successfully",
        });
      };
    } else {
      return res
        .status(400)
        .json({ status: false, error: "Image is required" });
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
    if (!email) throw "Email is requried";
    if (!postId) throw "Post Id is required";
    if (!+postId) throw "Post Id is not a valid number";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        posts: {
          where: {
            id: +postId,
          },
        },
      },
    });
    if (!user) throw "This user does not exist";
    if (user.posts.length == 0) throw "This post does not exist";

    await prisma.post.delete({
      where: {
        id: +postId,
      },
    });

    res.status(200).json({ status: true, msg: "Post successfully deleted" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.addCommentToPost = async (req, res) => {
  const { postId, comment } = req.body;
  try {
    const bearerToken = req.headers.authorization.split(" ")[1];
    const ILLEGAL_MSG =
      "Improper use of this API is illegal, this incident will be reported!!!";
    // if(!email) throw "Email is required";
    if (!postId) throw "Post Id is rquired";
    if (!+postId) throw "Post Id is not a valid number";
    if (!comment) throw "Comment is required";

    const privateKey = fs.readFileSync(`privateKey.key`);
    const result = jwt.verify(bearerToken, privateKey);

    if (!result) throw ILLEGAL_MSG;
    if (!result.email) throw ILLEGAL_MSG;

    const user = await prisma.user.findUnique({
      where: {
        email: result.email,
      },
    });

    if (!user) throw ILLEGAL_MSG;

    const post = await prisma.post.findUnique({
      where: {
        id: +postId,
      },
    });

    if (!post) throw ILLEGAL_MSG;

    const newComment = await prisma.comment.create({
      data: {
        comment,
        authorId: user.id,
        postId: post.id,
      },
      include: {
        post: {
          include: {
            author: true,
            comments: {
              include: {
                author: true,
              },
            },
            likes: true,
          },
        },
      },
    });

    res
      .status(200)
      .json({ status: true, msg: "New comment added", data: newComment });
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
module.exports.likePost = async (req, res) => {
  //todo: Optimize like so it feels like it's instant (i.e. faster query, query once)
  const { email, postId } = req.body;
  try {
    if (!email) throw "Email is required";
    if (!postId) throw "Post Id is required";
    if (!+postId) throw "Post Id is not a valid number";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) throw "This user does not exist";

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        likes: {
          where: {
            userId: user.id,
          },
        },
      },
    });

    if (!post) throw "This post does not exist";

    if (post.likes.length === 0) {
      const newLike = await prisma.like.create({
        data: {
          postId: post.id,
          userId: user.id,
        },
        include: {
          post: {
            include: {
              author: true,
              comments: {
                include: {
                  author: true,
                },
              },
              likes: true,
            },
          },
        },
      });

      return res
        .status(200)
        .json({ status: true, msg: "Post liked successfully", data: newLike });
    } else {
      const dislike = await prisma.like.delete({
        where: {
          id: post.likes[0].id,
        },
        include: {
          post: {
            include: {
              author: true,
              comments: {
                include: {
                  author: true,
                },
              },
              likes: {
                where: {
                  id: {
                    not: post.likes[0].id,
                  },
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        status: true,
        msg: "Post unliked successfully",
        data: dislike,
      });
    }

    // res.status(200).json({status: true, data: like});
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
module.exports.getValidatingUser = async (req, res) => {
  const { retrieveToken } = req.params;
  try {
    if (!retrieveToken) throw { code: 401, msg: "Invalid token" };
    console.log("WTF:", retrieveToken);
    const user = await prisma.temporaryUser.findUnique({
      where: {
        retrieveToken,
      },
    });

    if (!user) throw { code: 401, msg: "Invalid token" };

    res.status(200).json({ status: true, data: { email: user.email } });
  } catch (err) {
    res.status(err.code).json({ status: false, msg: err.msg });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.changePassword = async (req, res) => {
  const { email, oldPassword, password, password2 } = req.body;
  try {
    if (!email) throw "Email is required";
    if (!oldPassword) throw "Please enter your old password";
    if (!password) throw "Please enter your new password";
    if (!password2) throw "Please confirm your new password";
    if (password != password2) throw "Passwords do not match";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) throw "This user does not exist";

    const result = await bcrypt.compare(oldPassword, user.password);
    if (!result) throw "Incorrect password";

    const result2 = await bcrypt.compare(password, user.password);
    if (result2)
      throw "Your new password must not be the same as your current password!";

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hash,
      },
    });

    res
      .status(200)
      .json({ status: true, msg: "Password changed successfully" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.forgotPassword = async (req, res) => {
  const { token, password, password2 } = req.body;
  try {
    if (!token) throw "Token is missing";
    if (!password) throw "Password is required";
    if (!password2) throw "Please confirm your password";
    if (password != password2) throw "Passwords do not match";
    const resetToken = await prisma.resetToken.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) throw "Invalid token";

    const minutes = calculateTimeDiff(resetToken.createdAt);
    console.log("\nMinutes:", minutes);

    if (minutes > 7) {
      throw { status: 401, error: "This link has expired" };
    }
    const hash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: {
        id: resetToken.user.id,
      },
      data: {
        password: hash,
        updatedAt: new Date(),
      },
    });

    await prisma.resetToken.delete({
      where: {
        token,
      },
    });

    res
      .status(200)
      .json({ status: true, msg: "Password changed successfully" });
  } catch (err) {
    if (err.status) {
      return res.status(401).json({ status: false, error: err.error });
    }
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.sendResetPasswordLink = async (req, res) => {
  const { email } = req.params;
  try {
    if (!email) throw "Email is required";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        resetToken: true,
      },
    });
    //if user doesn't exist, don't send any email, just send as success
    if (!user) {
      return res
        .status(200)
        .json({ status: true, msg: "Password reset link sent successfully" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    console.log("Token:", token);
    const url = `https://www.faceclam.com/reset?token=${token}`;

    if (user.resetToken && user.resetToken.token) {
      await prisma.resetToken.update({
        where: {
          id: user.resetToken.id,
        },
        data: {
          token: token,
          createdAt: new Date(),
        },
      });
    } else {
      await prisma.resetToken.create({
        data: {
          token: token,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    }
    await sendLink(email, url);
    return res
      .status(200)
      .json({ status: true, msg: "Password reset link sent successfully" });
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
module.exports.verifyResetToken = async (req, res) => {
  const { token } = req.params;
  try {
    if (!token) throw { status: 400, error: "Token is required" };

    const result = await prisma.resetToken.findUnique({
      where: {
        token,
      },
    });

    if (!result) throw { status: 400, error: "Invalid token" };
    const minutes = calculateTimeDiff(result.createdAt);
    console.log("\nMinutes:", minutes);

    if (minutes > 7) {
      throw { status: 401, error: "This link has expired" };
    }

    res.status(200).json({ status: true, msg: "Token is valid" });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ status: false, error: err.error });
    }
    res.status(401).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Date} date recent time
 * @returns {number}
 */
const calculateTimeDiff = (date) => {
  const currentDate = new Date();
  const timeDiff = Math.abs(date.getTime() - currentDate.getTime());
  const timeDiffInSeconds = Math.ceil(timeDiff / 1000);
  return timeDiffInSeconds / 60;
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.getByName = async (req, res) => {
  const { name } = req.params;
  try {
    const [firstName, lastName, id] = name.split(".");

    if (!firstName) throw "First name is missing";
    if (!lastName) throw "Last name is missing";
    if (!id) throw "ID is missing";
    if (!+id) throw "Id must be a valid number";
    let requesterId = null;

    if (req.headers.authorization) {
      const bearerToken = req.headers.authorization.split(" ")[1];
      if (bearerToken !== "undefined" || bearerToken) {
        const privateKey = fs.readFileSync(`privateKey.key`);
        const result = jwt.verify(bearerToken, privateKey);
        requesterId = result.id;
      }
    }
    let user = null;

    if (requesterId) {
      user = await prisma.user.findUnique({
        where: {
          id: +id,
          firstName,
          lastName,
        },
        include: {
          posts: {
            orderBy: [
              {
                createdAt: "desc",
              },
            ],
            include: {
              likes: {
                include: {
                  user: true,
                },
              },
              comments: {
                include: {
                  author: true,
                },
              },
              author: true,
            },
          },
          likes: true,
          friendRequests: {
            where: {
              requesterId: requesterId,
            },
          },
        },
      });
    } else {
      user = await prisma.user.findUnique({
        where: {
          id: +id,
          firstName,
          lastName,
        },
        include: {
          posts: {
            orderBy: [
              {
                createdAt: "desc",
              },
            ],
            include: {
              likes: {
                include: {
                  user: true,
                },
              },
              comments: {
                include: {
                  author: true,
                },
              },
              author: true,
            },
          },
          likes: true,
        },
      });
    }

    if (!user) throw "User does not exist";

    res.status(200).json({ status: true, data: user });
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
module.exports.validateProfile = async (req, res) => {
  const { name } = req.params;
  try {
    const [firstName, lastName, id] = name.split(".");

    if (!firstName) throw "First name is missing";
    if (!lastName) throw "Last name is missing";
    if (!id) throw "ID is missing";
    if (!+id) throw "Id must be a valid number";

    const user = await prisma.user.findUnique({
      where: {
        id: +id,
        firstName,
        lastName,
      },
      include: {
        posts: {
          include: {
            author: true,
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        },
      },
    });

    if (!user) throw "User does not exist";

    if (!req.headers.authorization) {
      throw "Unauthorized";
    }
    const bearerToken = req.headers.authorization.split(" ")[1];

    if (bearerToken == "undefined") throw "Unauthorized";
    const privateKey = fs.readFileSync(`privateKey.key`);
    const result = jwt.verify(bearerToken, privateKey);
    console.log(result.firstName);
    if (
      result.id == +id &&
      result.firstName == firstName &&
      result.lastName == lastName
    ) {
      return res.status(200).json({ status: true, msg: "Verified" });
    }
    throw { currentUser: result, msg: "Unverified" };
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.updateBio = async (req, res) => {
  const { email, bio } = req.body;
  try {
    if (!email) throw "Email is missing";
    if (!bio) throw "Bio is required";

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) throw "User does not exist";

    await prisma.user.update({
      where: {
        email,
      },
      data: {
        bio,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ status: true, msg: "Bio updated successfully!" });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.getUnverified = async (req, res) => {
  try {
    const unverified = await prisma.temporaryUser.findMany({});
    res.status(200).json({ status: true, data: unverified });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

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
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          lte: new Date(lastDay.toISOString().split("T")[0]),
          gte: new Date(firstDay.toISOString().split("T")[0]),
        },
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
module.exports.getUnverifiedByCurrentMonth = async (req, res) => {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  try {
    const users = await prisma.temporaryUser.findMany({
      where: {
        createdAt: {
          lte: new Date(lastDay.toISOString().split("T")[0]),
          gte: new Date(firstDay.toISOString().split("T")[0]),
        },
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
module.exports.getByCurrentWeek = async (req, res) => {
  function getMonday(d) {
    d = new Date(d);
    const day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }
  try {
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          lte: new Date(getMonday(new Date()).toISOString().split("T")[0]),
          gte: new Date(new Date().toISOString().split("T")[0]),
        },
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
module.exports.sendFriendRequest = async (req, res) => {
  const { friendId } = req.params;
  try {
    if (!friendId) throw "Friend ID is required";
    if (!+friendId) throw "Friend ID must be a valid number";
    const bearerToken = req.headers.authorization.split(" ")[1];
    const privateKey = fs.readFileSync(`privateKey.key`);
    const { email } = jwt.verify(bearerToken, privateKey);
    if (!email) throw "Misproper use of api, this incident will be reported";

    const requester = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!requester)
      throw "Misproper use of api, this incident will be reported";

    const requestee = await prisma.user.findUnique({
      where: {
        id: +friendId,
      },
      include: {
        friendRequests: {
          where: {
            requesterId: requester.id,
          },
        },
      },
    });

    if (!requestee) throw "This user that you're trying to add does not exist";
    if (requestee.friendRequests.length !== 0)
      throw "Friend request have already been sent";

    await prisma.friendRequest.create({
      data: {
        userId: requestee.id,
        requesterId: requester.id,
      },
    });

    res
      .status(200)
      .json({ status: true, msg: "Friend request sent successfully" });
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
module.exports.cancelFriendRequest = async (req, res) => {
  const { friendId } = req.params;
  try {
    if (!friendId) throw "Missing friend Id";
    if (!+friendId) throw "Friend Id must be a valid number";

    const bearerToken = req.headers.authorization.split(' ')[1];
    const privateKey = fs.readFileSync(`privateKey.key`);
    const { id } = jwt.verify(bearerToken, privateKey);

    if (!id) throw "Invalid use of API, this incident will be reported!";

    const result = await prisma.friendRequest.findFirst({
      where: {
        requesterId: +id,
        userId: +friendId
      }
    });

    if (!result) throw "Invalid request!";

    await prisma.friendRequest.delete({
      where: {
        id: result.id
      }
    })
    res.status(200).json({ status: true, msg: "Friend request cancelled successfully" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: false, error: err });
  }
}

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.sendNotification = async (req, res) => {
  const { recipientId, type, description } = req.body;
  try {
    if (!recipientId) throw "Recipient Id is required";
    if (!type) throw "Type is required";
    if (!description) throw "Description is required";
    if (!+recipientId) throw "Recipient Id must be a valid number";

    const bearerToken = req.headers.authorization.split(" ")[1];
    const privateKey = fs.readFileSync(`privateKey.key`);
    const { email } = jwt.verify(bearerToken, privateKey);
    if (!email) throw "Misproper use of api, this incident will be reported";

    const sender = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!sender) throw "Misproper use of api, this incident will be reported";

    const recipient = await prisma.user.findUnique({
      where: {
        id: +recipientId,
      },
      include: {
        notifications: {
          where: {
            senderId: sender.id,
            type,
          },
        },
      },
    });

    if (!recipient) throw "This user does not exist";
    if (recipient.notifications.length > 0) {
      return res
        .status(304)
        .json({ status: true, msg: "Notification already sent" });
    }

    const newNotification = await prisma.notification.create({
      data: {
        recipientId: recipient.id,
        senderId: sender.id,
        type,
        createdAt: new Date(),
        description,
      },
    });

    return res
      .status(200)
      .json({ status: true, msg: "Notification sent", data: newNotification });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
module.exports.getPostNotifications = async (req, res) => {
  try {
    const bearerToken = req.headers.authorization.split(" ")[1];
    if (bearerToken === "undefined" || !bearerToken) throw "Invalid access";

    const privateKey = fs.readFileSync(`privateKey.key`);
    const { id } = jwt.verify(bearerToken, privateKey);
    if (!id) throw "Invalid use of API, this incident will be reported";

    const _notifications = await prisma.post.findMany({
      where: {
        notifications: {
          some: {
            recipientId: +id,
          },
        },
        authorId: +id,
      },
      include: {
        notifications: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    res.status(200).json({ status: true, data: _notifications });
  } catch (err) {
    res.status(400).json({ status: false, error: err });
  }
};

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
