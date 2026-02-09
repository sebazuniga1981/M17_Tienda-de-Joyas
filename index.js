const express = require("express");
const cors = require("cors");
require("dotenv").config();

const logger = require("./middlewares/logger");
const joyasRouter = require("./routes/joyas.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

app.use("/", joyasRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`✅ Servidor ON: http://localhost:${PORT}`));
