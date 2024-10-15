require("dotenv").config();
const express = require("express");
const cors = require("cors");

const benefitRouter = require("./routes/benefit");
const providerRouter = require("./routes/provider");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/benefit", benefitRouter);
app.use("/provider", providerRouter);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
