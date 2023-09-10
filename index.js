require("dotenv").config();
const app = require("./app");
const connectWithDb = require("./config/db");
const PORT = process.env.PORT || 4000;

const cloudinary = require("cloudinary");

// connect with database
connectWithDb();

//cloudinary config goes here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`);
});
