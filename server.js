import express from "express"
import cors from "cors"
import dotenv from "dotenv"

// Database
import connectDB from "./src/db/connectDB.js"

// Routes
import AuthRoutes from "./src/routes/auth.routes.js"
import UserRoutes from "./src/routes/user.routes.js"
import TournamentRoutes from "./src/routes/tournament.routes.js"
import MatchRoutes from "./src/routes/match.routes.js"
import CreatorsRoutes from "./src/routes/creatorsTournament.routes.js"
import PaymentRoutes from "./src/routes/payment.routes.js"
import FeedbackRoutes from "./src/routes/feedback.routes.js"


// Error Middleware
import errorMiddleware from "./src/middlewares/error.middleware.js"


// Loading Environment Variables First
dotenv.config()

const app = express()

// Razorpay Webhook Route
app.use(
    "/api/v1/payment/webhook",
    express.raw({ type: "application/json" })
)

// Default Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/public", express.static("public"))


const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5173',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));


// Connect DB
connectDB()


// Routes
app.use("/api/v1/auth", AuthRoutes)
app.use("/api/v1/user", UserRoutes)
app.use("/api/v1/tournament", TournamentRoutes)
app.use("/api/v1/match", MatchRoutes)
app.use("/api/v1/creators", CreatorsRoutes)
app.use("/api/v1/payment", PaymentRoutes)
app.use("/api/v1/feedback", FeedbackRoutes)


// Health Check
app.get("/", (req, res) => {
    res.status(200).send("Auth Server Running...")
})


// 404 API Not Found
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "API Not Found"
    })
})


// Error Middleware
app.use(errorMiddleware)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Tournament Server Started...`)
})