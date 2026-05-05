const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Min 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const exists = await User.findOne({ email: req.body.email });
      if (exists) return res.status(409).json({ message: "Email already registered" });

      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      });

      const token = signToken(user._id);
      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const user = await User.findOne({ email: req.body.email }).select("+password");
      if (!user || !(await user.comparePassword(req.body.password)))
        return res.status(401).json({ message: "Invalid credentials" });

      const token = signToken(user._id);
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/auth/me
router.get("/me", auth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});

module.exports = router;
