import express from "express";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {

    } catch (error) {
        
    }
    res.send("register ka dito boi")
});


router.post("/login", async (req, res) => {
    res.send("login ka dito boi")
});

export default router;