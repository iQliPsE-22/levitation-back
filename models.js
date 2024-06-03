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

module.exports = {
  Admin: mongoose.model("Admin", AdminSchema),
};
