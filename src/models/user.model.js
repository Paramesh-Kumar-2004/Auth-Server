import mongoose from "mongoose";
import bcrypt from "bcrypt"



const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Full Name Required"],
    },
    avatar: {
        type: String
    },
    email: {
        type: String,
        required: [true, "Email Required"],
        unique: [true, "Email Should Be Unique"]
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    emailOTP: {
        type: String,
        default: null
    },
    emailOTPExpires: {
        type: Date,
        default: null
    },
    emailOTPAttempts: {
        type: Number,
        default: 0
    },
    password: {
        type: String,
        required: [true, "Password Required"],
        select: false
    },
    phoneNumber: {
        type: String,
        required: [true, "Phone Number Is Required"]
    },
    playerName: {
        type: String,
        default: "Not Updated"
    },
    playerUID: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        enum: ["user", "creator", "manager", "admin", "superadmin"],
        default: "user"
    },
    customUrls: [{
        linkName: {
            type: String,
            required: true
        },
        link: {
            type: String,
            required: true
        },
    }],
    paymentDetails: {
        type: [String],
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    passwordResetToken: String
}, { timestamps: true })


UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});


UserSchema.methods.isValidPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}


export const User = mongoose.model("User", UserSchema);