const express = require("express");
 
const{auth} = require("../middleware/authMiddleware");

const User = require("../models/User");
const {Signup,Login, profile} = require("../controller/authController");

const route = express.Router();
 


route.get("/profile",auth,profile)
route.post("/signup",Signup);

route.post("/login",Login);

module.exports = route; 
