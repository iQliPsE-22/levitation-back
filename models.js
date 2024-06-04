const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  profilePicture: {
    data: Buffer,
    contentType: String,
  },
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
});

const cartSchema = new mongoose.Schema({
  user: String,
  name: String,
  price: String,
  quantity: String,
});

module.exports = {
  Admin: mongoose.model("Admin", AdminSchema),
  Cart: mongoose.model("Cart", cartSchema),
};
