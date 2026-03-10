const express = require("express");

const DriverEvent = require("../models/AttentionLog");


exports.driverinfo = async(req,res) => {
     
    try {
       const event = new DriverEvent(req.body);

       console.log(event); 
       
        
       await event.save(); 


       res.status(200).json({
        success:true,
        message : "Driver data stored successfully "
       })

    }
    catch(err){
        console.log(err);
        return res.status(501).json({
            success:false, 
            message:"Server Error",
        })
    }

}