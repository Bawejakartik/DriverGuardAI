const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt= require("bcrypt");


exports.Signup = async (req,res) => {

    try{
          const {fullname ,  email ,drivingLicense ,password }= req.body; 
           
          if(!fullname || !email || !drivingLicense || !password){
            return res.status(401).json({
                success: false, 
                message:"All field are required"
            })
          }

          const exisitingUser = await User.findOne({email , fullname});

          if(exisitingUser){
            return res.status(401).json({
                success:false,
                message:"User with this cridentials is already exist "
            })
          }
          
          const hashedpassword = await bcrypt.hash(password,10);


          const user = await User.create({
            fullname, 
            email,
            password : hashedpassword,
            drivingLicense
          })

           return res.status(200).json({
            user, 
            success:true,
            message:"user created successfully"
           })
    }
    catch(err){
        return res.status(500).json({
            success:false,
            message:"user not registered . Try again later"
        })
    }
}


exports.Login = async (req,res) => {
  try{
      
    const{email,password} = req.body; 

    if(!email || !password) {
        return res.status(401).json({
            success:false,
            message: "please fill all the cridentials "
        })
    }

    let user = await User.findOne({email});

    if(!user) {
        return res.status(401).json({
            success :false ,
            message :"please register firstly to DriverGuardAI"
        })
    }

     const payload = {
        id : user._id

     }
    

     if(await bcrypt.compare(password,user.password)){


        const token = jwt.sign(payload,process.env.SECRET_KEY,{expiresIn:'2h'});
   
        user.password  = undefined ; 


         const option = {
           expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
           httpOnly: true,
         };

          res.cookie("Token",token ,option).status(201).json({
            success:true,
            user,
            token,
            message:"User logged in successfully",

          })

         
     }

     else {
        return res.status(401).json({
            success : false,
            message:"password is incorrect "
        })
     }

  }
  catch(err){
    console.log(err);

    return res.status(500).json({
        success:"false",
        message:"server side error "
    })
  }
}