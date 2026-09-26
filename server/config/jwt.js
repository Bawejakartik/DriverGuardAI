const jwt = require("jsonwebtoken");

const getSecret = () => {
  if (!process.env.SECRET_KEY) {
    throw new Error("SECRET_KEY is not configured");
  }
  return process.env.SECRET_KEY;
};

const signToken = (userId) =>
  jwt.sign({ id: userId }, getSecret(), { expiresIn: "2h" });

module.exports = { signToken };
