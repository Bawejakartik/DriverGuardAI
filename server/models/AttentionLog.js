const mongoose = require("mongoose");

const driverAttentionSchema  = mongoose.Schema({

    driverid:{
        type : String , 
     
        required: true,

    },
    face_detected:{
        type :Boolean,
    },
    driverStatus:{
           type :String, 
           enum : ["SAFE","DROWSY","SLEEPING"]

    },
    eyeStatus:{
        type:String,
        enum:["open","closed"],
    },
    // earValue:{
    //     type:Number,
    //     default:0 
    // }
    time:{
        type : Date ,
        default : Date.now
    }
})


module.exports = mongoose.model("DriverEvent",driverAttentionSchema); 
