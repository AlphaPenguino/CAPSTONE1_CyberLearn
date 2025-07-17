import jwt from "jsonwebtoken";
import User from "../models/Users.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      privilege: user.privilege,
      ...user.toObject()
    };
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRole = (roles) => {
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