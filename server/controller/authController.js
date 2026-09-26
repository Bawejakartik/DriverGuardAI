const bcrypt = require("bcrypt");
const User = require("../models/User");
const { signToken } = require("../config/jwt");

const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

exports.Signup = async (req, res) => {
  try {
    const { fullname, email, drivingLicense, password } = req.body;

    if (!fullname || !email || !drivingLicense || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { drivingLicense: drivingLicense.trim() }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email or driving license already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullname: fullname.trim(),
      email: normalizedEmail,
      drivingLicense: drivingLicense.trim(),
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = signToken(user._id.toString());
    res.cookie("Token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("cars");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.logout = async (_req, res) => {
  res.clearCookie("Token");
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};
