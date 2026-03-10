const mongoose = require("mongoose");

const driverAttentionSchema  = mongoose.Schema({

    driverid:{
        type : String , 
     
        required: true,

    },
    face_detected:{
        type :Boolean,
    },
    eyeStatus:{
        type:String,
        enum:["open","closed"],
    },
    earValue:{
        type:Number,
        default:0 
    }
})


module.exports = mongoose.model("DriverEvent",driverAttentionSchema); 
