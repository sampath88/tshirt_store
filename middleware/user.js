const User = require("../models/user.model");
const CustomError = require("../utils/CustomError");
const BigPromise = require("./BigPromise");
const jwt = require("jsonwebtoken");

exports.isLoggedIn = BigPromise(async (req, res, next) => {
  const token =
    req.cookies.token ||
    req.body.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(403).send("Unauthorized user");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (error) {
    return res.status(401).send("Invalid Token");
  }
  return next();
});
