const express = require("express");
 
const User = require("../models/User");
const {Signup,Login} = require("../controller/authController");

const route = express.Router();
 

route.post("/signup",Signup);

route.post("/login",Login);

module.exports = route; 
