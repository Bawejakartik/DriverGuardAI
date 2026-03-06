const mongoose  = require("mongoose");


const userSchema = mongoose.Schema({

    fullname : {
        type:String,
        require:true,
        
    },
    email :{
        type:String,
        require:true,
        unique:true,
    },
    drivingLicense :{
        type:Number,
        unique:true,
        require:true,
    },
    password:{
        type:String,
        require:true,

    },
    
},{timestamps:true})

const userModel = mongoose.model("user",userSchema);

module.exports = userModel; 
