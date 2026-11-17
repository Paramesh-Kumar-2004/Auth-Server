import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()


const ConnectionString = process.env.CONNECTION_STRING

const connectDB = async () => {
    await mongoose.connect(ConnectionString)
        .then(() => {
            console.log("Database Connected Successfully")
        })
        .catch(err => console.log("Error :", err))
}

export default connectDB