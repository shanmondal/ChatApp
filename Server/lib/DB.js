import mongoose from "mongoose";
import { env } from "process";
 // Code to connect to MongoDB
 export const connectDB = async ()=>{
  try {
    mongoose.connection.on("connected", ()=>console.log("Database Connected"))
    await mongoose.connect(`${process.env.MONGODB_URI}/Chating-app`)
    
  } catch (error) {
    console.log(error);
  }
 }