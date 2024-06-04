const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const { Admin, Cart } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectToDatabase = require("../db");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

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

// server.post("/cart", async (req, res) => {
//   const { user, name, quantity, price } = req.body;
//   try {
//     let cart = await Cart.findOne({ userId: user });
//     if (cart) {
//       cart.cart.push({ name, quantity, price });
//       await cart.save();
//     } else {
//       cart = new Cart({
//         userId: user,
//         cart: [{ name, quantity, price }],
//       });
//       await cart.save();
//     }
//     res.status(200).json({ message: "Product added to cart" });
//   } catch (error) {
//     console.error("Error adding product to cart:", error);
//     res.status(500).json({ error: "Error adding product to cart" });
//   }
// });

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

// server.get("/generate-invoice", async (req, res) => {
//   try {
//     const browser = await puppeteer.launch({
//       headless: true,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     const page = await browser.newPage();

//     // Set a higher timeout
//     await page.goto("http://localhost:5173/invoice", {
//       waitUntil: "networkidle2",
//       timeout: 60000, // 60 seconds
//     });

//     // Generate PDF
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//     });

//     await browser.close();

//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": "attachment; filename=invoice.pdf",
//     });

//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     res.status(500).send("Error generating PDF");
//   }
// });
server.post("/generate-invoice", async (req, res) => {
  try {
    const { cart, userData } = req.body;

    // Launch Puppeteer with increased timeout and error handling
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const invoiceContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 960px; margin: auto; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; }
          .header img { height: 40px; }
          .invoice-details { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; margin-top: 20px; }
          .terms { margin-top: 20px; padding: 20px; background-color: #333; color: white; border-radius: 8px; }
          .terms p { margin: 0; }
          .terms .title { font-weight: bold; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1>INVOICE</h1>
            </div>
            <div class="logo">
              <img src="cid:logo.png" alt="levitation">
              <div>
                <h2>levitation</h2>
                <p class="text-gray-500">infotech</p>
              </div>
            </div>
          </div>
          <div class="invoice-details">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${cart
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
          </div>
          <div class="total">
            <p>Total Amount: INR ${cart
              .reduce((acc, item) => acc + item.quantity * item.price, 0)
              .toFixed(2)}</p>
          </div>
          <div class="terms">
            <p class="title">Terms and Conditions</p>
            <p>We are happy to supply any further information you may need and trust that you call on us to fill your order, which will receive our prompt and careful attention.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(invoiceContent, { waitUntil: "networkidle0" });

    // Add local image to PDF
    const logoPath = path.resolve(__dirname, "../levi.png");
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
  res.send("<h1>Server is running</h1>");
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
module.exports = server;
