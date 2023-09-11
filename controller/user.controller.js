const User = require("../models/user.model");
const BigPromise = require("../middleware/BigPromise");
const CustomError = require("../utils/CustomError");
const cookieToken = require("../utils/cookieToken");
const fileupload = require("express-fileupload");
const cloudinary = require("cloudinary");
const mailHelper = require("../utils/emailHelper");
const crypto = require("crypto");

exports.signup = BigPromise(async (req, res, next) => {
  if (!req.files) {
    return next(new CustomError("photo is required for signup", 400));
  }
  const { name, email, password } = req.body;

  if (!(email && name && password)) {
    return next(new CustomError("Name, email and password are required", 400));
  }

  let file = req.files.photo;
  const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
    folder: "users",
    width: 150,
    crop: "scale",
  });

  const user = await User.create({
    name,
    email,
    password,
    photo: {
      id: result.public_id,
      secure_url: result.secure_url,
    },
  });

  cookieToken(user, res);
});

exports.login = BigPromise(async (req, res, next) => {
  const { email, password } = req.body;

  //check for presence of email and password
  if (!(email && password)) {
    return next(new CustomError("please provide email and password", 400));
  }

  // get user from DB
  const user = await User.findOne({ email }).select("+password");

  // if user not exist in DB
  if (!user) {
    return next(
      new CustomError("Email or password does not match or exist", 400)
    );
  }

  // match the password
  const isValidPassword = await user.isValidPassword(password);

  //if password do not match
  if (!isValidPassword) {
    return next(
      new CustomError("Email or password does not match or exist", 400)
    );
  }

  // if all goes good and we send token
  cookieToken(user, res);
});

exports.logout = BigPromise(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "Logout success",
  });
});

exports.forgotPassword = BigPromise(async (req, res, next) => {
  // collect email
  const { email } = req.body;

  //check for presence of email
  if (!email) {
    return next(new CustomError("please provide email", 400));
  }

  // get user from DB
  const user = await User.findOne({ email });

  // if user not exist in DB
  if (!user) {
    return next(new CustomError("Email does not match or exist", 400));
  }

  // get token from user model methods
  const forgotPasswordToken = user.getForgotPasswordToken();

  // save user fields in DB
  await user.save({ validateBeforeSave: false });

  // create a URL
  const myUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${forgotPasswordToken}`;

  // craft a message
  const message = `Copy paste this link in your URL and hit enter \n\n ${myUrl}`;

  // attempt to send email
  try {
    await mailHelper({
      email: user.email,
      subject: "LCO T-Shirt store -Password reset email",
      message,
    });

    // json response if email is success
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    // reset user fields if things goes wrong
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new CustomError(error.message, 500));
  }
});
exports.passwordReset = BigPromise(async (req, res, next) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  // check for presence of token, password and confirm password
  if (!(token && password && confirmPassword)) {
    return next(new CustomError("password and confirm password are required"));
  }

  // encrypt the token
  const encryptedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // find the user in DB
  const user = await User.findOne({
    forgotPasswordToken: encryptedToken,
    forgotPasswordExpiry: { $gt: Date.now() }, // if not expired
  });

  // if user not exist in DB
  if (!user) {
    return next(new CustomError("Token is invalid or expired", 400));
  }

  // if password and confirmPassword do not match
  if (password !== confirmPassword) {
    return next(
      new CustomError("password and confirm password do not match", 400)
    );
  }

  // update password
  user.password = password;

  // reset user fields
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  // save user fields in DB
  await user.save();

  // send a JSON response OR send token
  cookieToken(user, res);
});
