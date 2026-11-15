const express = require("express");

const {login,getMe} = require("../../controllers/login.controller/login.controller");
const {register}=require("../../controllers/register.controller/register.contorller")
const authenticateUser = require("../../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", authenticateUser, getMe);

module.exports = router;