const express = require("express");

const DriverEvent = require("../models/AttentionLog");


exports.driverInfo = async(req, res) => {

    try{
        const {driverStatus} = req.body ; 

        const lastEvent = await DriverEvent.findOne().sort({time: -1});

        if(lastEvent && lastEvent.driverStatus === driverStatus){
            return res.status(200).json({
                success: true, 
                message:"No status change , not saved  "
            })
        }
        const event = new DriverEvent(req.body);
         
        await event.save();

        console.log("New Event Stored ",event ); 

        res.status(200).json({
            success:true,
            message:"Driver event stored"
        })
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"server error "
        }
        )
    }
}