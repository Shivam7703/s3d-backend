const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const mailRoutes = require("./routes/mailroutes")
const chatRoutes = require("./routes/chatroutes")
dotenv.config();

const app = express();
const port = process.env.PORT || 8000


app.use(cors());
app.use(express.json());

// api routes
app.use('/api', mailRoutes);
app.use("/api", chatRoutes);

// server listen
app.listen(port, async () => {
  console.log(`server running on ${port}`);
})