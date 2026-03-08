const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.auth = (req, res, next) => {

    try{

        const token = req.headers.authorization.split(" ")[1];

        // const token = req.cookies.token; 


        if(!token) {
            return res.status(402).json({
                success: false,
                message :"token is missing ",
            })
        }

        const decode = jwt.verify(token,process.env.SECRET_KEY);
        console.log(decode );

        if(!decode){
            return res.status(401).json({
                message : "invalid token",
                success : false
            })
        }

     
        req.user = decode  ; 
        next(); 


    }
    catch(err){
        console.log(err);
              
        return res.status(401).json({
            success:false,
            message : "Token invalid "
        })
    }
}