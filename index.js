const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const { Admin, Cart } = require("./models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectToDatabase = require("./db");
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const chromium = require("chrome-aws-lambda");
require("dotenv").config();
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

server.post("/cart", async (req, res) => {
  const { email, name, quantity, price } = req.body;
  console.log(req.body);
  try {
    const existingCart = await Cart.findOne({ name });
    if (existingCart) {
      return res.status(401).json({ message: "Item already exists in cart" });
    }
    const cart = new Cart({
      email,
      name,
      quantity,
      price,
    });

    await cart.save();
    res.status(201).json({ message: "Added to cart successfully" });
    console.log("Added to cart successfully");
  } catch (error) {
    res.status(500).json({ error: "Error adding to cart" });
    console.log(error);
  }
});

server.get("/cart/:email", async (req, res) => {
  const { email } = req.params;
  console.log(req.params);
  try {
    const docs = await Cart.find({ email });
    res.json(docs);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Error fetching cart" });
  }
});

server.post("/generate-invoice", async (req, res) => {
  try {
    const { cart } = req.body;
    const cartData = req.body;
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log("PUPPETEER_EXECUTABLE_PATH:", chromePath);
    console.log(puppeteer.executablePath());
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath: chromePath,
      // process.env.NODE_ENV === "production"
      //   ? process.env.PUPPETEER_EXECUTABLE_PATH
      //   : puppeteer.executablePath(),
    });
    const page = await browser.newPage();

    const invoiceContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .max-w-4xl { max-width: 960px; margin: auto; padding: 20px; }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .mt-8 { margin-top: 2rem; }
          .h-10 { height: 2.5rem; }
          .w-10 { width: 2.5rem; }
          .text-xl { font-size: 1.25rem; }
          .text-2xl { font-size: 1.5rem; }
          .font-bold { font-weight: bold; }
          .text-gray-500 { color: #6B7280; }
          .bg-white { background-color: #fff; }
          .bg-gray-800 { background-color: #333; }
          .text-white { color: #fff; }
          .text-blue-600 { color: #2563EB; }
          .rounded-md { border-radius: 0.375rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          p { margin: 0; }
        </style>
      </head>
      <body>
        <div class="max-w-4xl">
          <div class="flex items-center justify-between">
            <div class="text-left">
              <h1 class="text-xl font-bold">INVOICE</h1>
            </div>
            <div class="flex items-center mt-8">
              <img src="cid:logo.png" class="h-10 w-10" alt="levitation">
              <div>
                <h2 class="text-2xl font-bold">levitation</h2>
                <p class="text-gray-500 text-right">infotech</p>
              </div>
            </div>
          </div>
          <table class="bg-white">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cartData
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price}</td>
                  <td class="text-right">INR ${(
                    item.quantity * item.price
                  ).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="flex justify-between items-center mt-8">
            <div>
              <p class="font-bold">Total</p>
              <p class="font-bold">GST</p>
              <p class="text-blue-600 font-bold text-xl">Grand Total</p>
            </div>
            <div class="text-right">
              <p>INR ${cartData
                .reduce((acc, item) => acc + item.quantity * item.price, 0)
                .toFixed(2)}</p>
              <p>${(
                cartData.reduce(
                  (acc, item) => acc + item.quantity * item.price,
                  0
                ) * 0.18
              ).toFixed(2)}</p>
              <p class="text-blue-600 font-bold text-xl">
                ₹ ${(
                  cartData.reduce(
                    (acc, item) => acc + item.quantity * item.price,
                    0
                  ) * 1.18
                ).toFixed(2)}
              </p>
            </div>
          </div>
          <p class="mt-8 text-gray-500">Valid until:
            <span class="font-bold">${new Date(
              Date.now() + 15 * 24 * 60 * 60 * 1000
            ).toLocaleDateString()}</span>
          </p>
          <div class="mt-8 bg-gray-800 text-white p-4 rounded-md">
            <p class="font-bold">Terms and Conditions</p>
            <p>We are happy to supply any further information you may need and trust that you call on us to fill your order, which will receive our prompt and careful attention.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await page.setContent(invoiceContent, { waitUntil: "networkidle0" });

    // Add local image to PDF
    const logoPath = path.resolve(__dirname, "./levi.png");
    const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    const logoDataUri = `data:image/png;base64,${logoBase64}`;
    await page.evaluate((logoDataUri) => {
      document.querySelector("img[alt='levitation']").src = logoDataUri;
    }, logoDataUri);

    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

    // Send PDF as response
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="invoice.pdf"',
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});
server.get("/signup", async (req, res) => {
  const docs = await Admin.find();
  res.json(docs);
});

server.get("/", (req, res) => {
  res.send("<h1>Levitation Server is running</h1>");
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
module.exports = server;
