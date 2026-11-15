const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../../config/prisma");

const {
  registerSchema,
} = require("../../validators/auth.validator");



// Register a new user
const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = validation.data;

    // Check whether the email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`New account created: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    console.error("Registration failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
};


module.exports = {
  register,
};