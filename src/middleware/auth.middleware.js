import { Match } from "../models/match.model.js";
import { Tournament } from "../models/tournament.model.js";
import { CreatorsTournament } from "../models/creatorsTournament.model.js";
import { User } from "../models/user.model.js";
import { jwtVerify } from "../utils/jwt.utils.js";



const authentication = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized, Login and Try Again"
            });
        }

        const token = authHeader.split(" ")[1];
        const decode = await jwtVerify(token)
        const user = await User.findById(decode.id)

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized User, Login and Try Again"
            });
        }

        req.user = user
        next()
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" })
    }
}


const authorization = (roles) => {
    return (req, res, next) => {
        try {

            const user = req.user;
            if (!roles.includes(user.role)) {
                return res.status(403).json({
                    message: "You Don't Have Permission To Access This Resource"
                });
            }
            next();

        } catch (error) {
            console.log(error)
            res.status(500).json({
                message: "Intenal Server Error"
            })
        }
    }
}


// Access Controll
const hasTournamentAccess = (tournament, userId) => {
    return (
        tournament.user.equals(userId) ||
        tournament.organisers.some(id => id.equals(userId))
    )
}

const tournamentAccess = async (req, res, next) => {
    try {
        const { tournament } = req.params

        const isReadOnly = ["GET", "HEAD", "OPTIONS"].includes(req.method);

        const existingTournament = await Tournament.findById(tournament)
        if (!existingTournament) {
            return res.status(404).json({ message: "Tournament not found" })
        }

        if (!existingTournament.isApproved) {
            return res.status(400).json({
                message: "Tournament Not Approved"
            })
        }

        if (!hasTournamentAccess(existingTournament, req.user._id)) {
            return res.status(403).json({ message: "Creator or Organizers Can Access" })
        }

        if (!isReadOnly) {
            if (existingTournament.status === "completed") {
                return res.status(400).json({
                    message: "Tournament is completed. No further changes allowed."
                })
            }
        }

        req.tournament = existingTournament
        next()

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

const matchAccess = async (req, res, next) => {
    try {
        const { match } = req.params

        const isReadOnly = ["GET", "HEAD", "OPTIONS"].includes(req.method);

        const existingMatch = await Match.findById(match).populate('tournament')
        if (!existingMatch) {
            return res.status(404).json({ message: "Match not found" })
        }

        const existingTournament = existingMatch.tournament

        if (!existingTournament.isApproved) {
            return res.status(400).json({
                message: "Tournament Not Approved"
            })
        }

        if (!hasTournamentAccess(existingTournament, req.user._id)) {
            return res.status(403).json({ message: "Creator or Organizers Can Access" })
        }

        if (!isReadOnly) {
            if (existingTournament.status === "completed") {
                return res.status(400).json({
                    message: "Tournament is completed. No further changes allowed."
                })
            }
        }

        if (!isReadOnly) {
            if (existingMatch.status === "completed") {
                return res.status(400).json({
                    message: "Match is completed. No further changes allowed."
                })
            }
        }

        req.tournament = existingTournament
        next()

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}



const creatorsTournamentAccess = async (req, res, next) => {
    try {
        const { tournament } = req.params

        const existingTournament = await CreatorsTournament.findById(tournament)
        if (!existingTournament) {
            return res.status(404).json({ message: "Creators Tournament not found" })
        }

        if (!existingTournament.isApproved) {
            return res.status(400).json({
                message: "Creators Tournament Not Approved"
            })
        }

        if (!hasTournamentAccess(existingTournament, req.user._id)) {
            return res.status(403).json({ message: "Creator or Organizers Can Access" })
        }

        if (existingTournament.status === "completed") {
            return res.status(400).json({
                message: "Tournament is completed. No further changes allowed."
            })
        }

        req.tournament = existingTournament
        next()

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}



export {
    authentication,
    authorization,
    tournamentAccess,
    creatorsTournamentAccess,
    matchAccess,
}