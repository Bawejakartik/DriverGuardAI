const express = require("express");
const route = express.Router();

const {driverInfo} = require ("../controller/attentionController");

route.post("/driver-event",driverInfo); 
 


module.exports = route ; 
