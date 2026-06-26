const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../data/db.json");

const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const writeDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const db = readDB();
    const existingUser = db.users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: "user",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
};

exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ message: "User not found" });

    db.users[userIndex].name = name || db.users[userIndex].name;
    writeDB(db);

    const { password, ...updatedUser } = db.users[userIndex];
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};