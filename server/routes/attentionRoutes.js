const express = require("express");
const route = express.Router();

const {driverinfo} = require ("../controller/attentionController");

route.post("/driver-event",driverinfo); 
 


module.exports = route ; 
