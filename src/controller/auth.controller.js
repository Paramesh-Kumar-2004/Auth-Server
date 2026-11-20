import crypto from "crypto";
import { User } from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { jwtSign } from "../utils/jwt.utils.js";
import sendMail from "../utils/sendMail.js";



const registerUser = asyncHandler(async (req, res) => {

    console.log("Entered Into Register Controller")
    const {
        fullName,
        email,
        phoneNumber,
        password
    } = req.body;

    if (!fullName || !email || !password || !phoneNumber) {
        throw new ApiError(404, "Enter All The Fields")
    }

    const exsitingUser = await User.findOne({ email })
    if (exsitingUser) {
        throw new ApiError(400, "User Already Registered")
    }

    const addUser = await User.create({
        fullName, email, password, phoneNumber
    })

    res.status(200).json({
        message: "Register Successfully",
    })
})


const loginUser = asyncHandler(async (req, res) => {
    console.log("Entered Into Login User Controller")

    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(404, "Enter All The Fields")
    }

    const user = await User.findOne({ email })
        .select("+password")
    if (!user) {
        throw new ApiError(404, "Email Not Found")
    }

    if (!await user.isValidPassword(password)) {
        throw new ApiError(404, "Invalid Password")
    }

    if (await user.isValidPassword(password)) {

        const token = await jwtSign(user._id)
        res.status(200).json({
            message: "Login Successfull",
            userId: user._id,
            email,
            role: user.role,
            token,
        })
    }

})


const logoutUser = asyncHandler(async (req, res) => {
    console.log("Entered Into Logout User Controller")
    const { userId } = req.user._id;

    if (!userId) {
        throw new ApiError(404, "User Not Found")
    }

    await User.findByIdAndUpdate(userId, {
        $unset: { passwordResetToken: undefined }
    });

    res.status(200).json({
        message: "Logout Successfull"
    })
})


const forgotPassword = asyncHandler(async (req, res) => {
    console.log("Entered Into Forgot Password Controller")
    const { email } = req.body;

    if (!email) {
        throw new ApiError(404, "Enter All The Fields")
    }

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User Not Found")
    }

    const token = await jwtSign(user._id)
    user.passwordResetToken = token
    await user.save()

    await sendMail(
        user.email,
        "Password Reset Link",
        `Please Click On The Link To Reset Your Password \n${process.env.CLIENT_URL}/reset-password/${token}`
    )

    res.status(200).json({
        message: "Password Reset Link Sent Successfully"
    })
})


const resetPassword = asyncHandler(async (req, res) => {
    console.log("Entered Into Reset Password Controller")
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        throw new ApiError(404, "Enter All The Fields")
    }

    const user = await User.findOne({ passwordResetToken: token })
    if (!user) {
        throw new ApiError(404, "Invalid Token")
    }

    user.password = password
    user.passwordResetToken = undefined
    await user.save()

    await sendMail(
        user.email,
        "Password Reset Successfully",
        `Your Password Was Reset`
    )

    res.status(200).json({
        message: "Password Reset Successfully"
    })
})


const changePassword = asyncHandler(async (req, res) => {
    console.log("Entered Into Change Password Controller")
    const { _id } = req.user;
    const { oldPassword, newPassword } = req.body

    if (!_id || !oldPassword || !newPassword) {
        throw new ApiError(404, "Enter All The Fields")
    }

    const user = await User.findById(_id)
    if (!user) {
        throw new ApiError(404, "User Not Found")
    }

    const checkPassword = await user.isValidPassword(oldPassword)

    if (!checkPassword) {
        throw new ApiError(404, "Invalid Password")
    }

    if (checkPassword) {
        user.password = newPassword
        await user.save()
        await sendMail(
            user.email,
            "Password Reset Successfully",
            `Your Password Was Changed`
        )

        res.status(200).json({
            message: "Password Changed Successfully"
        })
    }
})



// Generate a secure 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

// Hash OTP before storing it
const hashOTP = (otp) => {
    return crypto.createHash("sha256").update(otp).digest("hex");
};

// Send OTP
const sendOTP = asyncHandler(async (req, res) => {
    console.log("Entered Into Sent OTP")

    const email = req.user.email?.trim().toLowerCase();

    if (!email) {
        throw new ApiError(400, "Email Is Required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User Not Found");
    }

    if (user.isVerified) {
        return res.status(200).json({
            message: "Email Already Verified"
        });
    }

    const otp = generateOTP();

    user.emailOTP = hashOTP(otp);
    user.emailOTPExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.emailOTPAttempts = 0;

    await user.save();

    try {
        await sendMail(
            user.email,
            "Email Verification OTP",
            `Your One-Time Password (OTP) For email Verification Is: ${otp}`
        );
    } catch (error) {
        user.emailOTP = null;
        user.emailOTPExpires = null;
        await user.save();

        throw new ApiError(500, "Failed To Send OTP");
    }

    return res.status(200).json({
        message: "OTP Sent Successfully"
    });
});


// Verify User Email
const verifyOtp = asyncHandler(async (req, res) => {
    console.log("Entered Into Verify OTP")

    const email = req.user.email?.trim().toLowerCase();
    const { otp } = req.body;
    console.log(otp)

    if (!email || !otp) {
        throw new ApiError(400, "Email And OTP Are Required");
    }

    if (!/^\d{6}$/.test(otp)) {
        throw new ApiError(400, "OTP Must Be 6 Digits");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User Not Found");
    }

    if (user.isVerified) {
        return res.status(200).json({
            message: "Email Already Verified"
        });
    }

    if (!user.emailOTP || !user.emailOTPExpires) {
        throw new ApiError(400, "Please Request A New OTP");
    }

    if (user.emailOTPExpires.getTime() <= Date.now()) {
        user.emailOTP = null;
        user.emailOTPExpires = null;
        user.emailOTPAttempts = 0;

        await user.save();

        throw new ApiError(400, "OTP Expired. Request A New OTP");
    }

    if (user.emailOTPAttempts >= 5) {
        throw new ApiError(
            429,
            "Too Many Attempts. Request A New OTP"
        );
    }

    const submittedHash = hashOTP(otp);
    const storedBuffer = Buffer.from(user.emailOTP, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    const isValid =
        storedBuffer.length === submittedBuffer.length &&
        crypto.timingSafeEqual(storedBuffer, submittedBuffer);

    if (!isValid) {
        user.emailOTPAttempts += 1;
        await user.save();

        throw new ApiError(
            400,
            `Invalid OTP. ${5 - user.emailOTPAttempts} Attempts Remaining`
        );
    }

    user.isVerified = true;
    user.emailOTP = null;
    user.emailOTPExpires = null;
    user.emailOTPAttempts = 0;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Your Email Has Been Verified Successfully."
    });
});


export {
    // Public Routes
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,

    // Private Routes
    logoutUser,
    changePassword,

    // Email Verification
    sendOTP,
    verifyOtp,
}