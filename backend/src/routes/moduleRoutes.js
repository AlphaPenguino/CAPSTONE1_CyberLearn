import express from "express";

const router = express.Router();


//create

//get all games
router.get("/", (req, res) => {
    res.json({message: "Module API is working"});
});

export default router;