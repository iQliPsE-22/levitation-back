const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); // Allow anyone for the request
const multer = require("multer"); // Allow image to be uploaded to the database
const { Admin } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../db"); // Adjust the path as needed

connectToDatabase();

const server = express();

server.use(bodyParser.json());
server.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ROUTES

server.post("/signup", upload.single("profilePicture"), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirm } = req.body;
    console.log(req.body);
    console.log(req.file);
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(401).json({ message: "Admin already exists" });
    }
    const encryptedPass = await bcrypt.hash(password, 10);
    const admin = new Admin({
      profilePicture: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      firstName,
      lastName,
      email,
      phone,
      password: encryptedPass,
    });

    await admin.save();
    const token = jwt.sign(
      { id: user._id, email },
      "shhhh", //process.env.jwtsecret
      {
        expiresIn: "2h",
      }
    );
    user.token = token;
    user.password = undefined; //making password not send to db

    //cookie section
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    res.status(200).cookie("token", token, options).json({
      success: true,
      token,
      admin,
    });
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error creating admin" });
  }
});

server.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign(
        { id: admin._id },
        "shhhh", //process.env.jwtsecret
        {
          expiresIn: "2h",
        }
      );
      admin.token = token;
      admin.password = undefined; //making password not send to db
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.status(200).cookie("token", token, options).json({
        success: true,
        token,
        admin,
      });
      console.log("Admin logged in successfully");
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error logging in admin" });
  }
});

server.get("/admin", async (req, res) => {
  const docs = await Admin.find();
  res.json(docs);
});

server.get("/", (req, res) => {
  res.send("<h1>Server is running</h1>");
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
module.exports = server;
