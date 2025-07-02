import jwt from "jsonwebtoken";
import User from "../models/Users.js";

const protectRoute = async (req, res, next) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "");

        if(!token) {
            return res.status(401).json({ message: "Access denied, no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");

        if(!user) {
            return res.status(401).json({ message: "Token is not valid" });
        }
        req.user = user;

        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!roles.includes(req.user.privilege)) {
            return res.status(403).json({ message: "Access denied, insufficient privileges" });
        }

        next();
    }
}

export { protectRoute, authorizeRole };