require("dotenv").config();

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const appealsRoute = require("./routes/appealsRoute");

const { swaggerUi, specs } = require("./config/swagger");

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use("/api", appealsRoute);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
