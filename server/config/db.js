const mongoose = require("mongoose");
require("dotenv").config();

exports.connect =() => {
 
      mongoose.connect(process.env.DB_URL)
      .then(() => {
        console.log("database connected successfully");

      })
      .catch((err)=> {
        console.log(err);

        console.log("database not connected successfully");
         
      })
}