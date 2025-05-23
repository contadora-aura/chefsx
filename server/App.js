const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Ajv = require("ajv");
const ajv = new Ajv();
const app = express();

// Importovanie logiky pre recepty
const recipesRouter = require("./recipes.js");
// Importovanie logiky pre používateľov
const usersRouter = require("./users.js");
// Importovanie logiky pre komentáre
const commentsRouter = require("./comments.js");

const port = 8000;
app.use(cors());
app.use(express.json());

// Receptový router
app.use("/recipes", recipesRouter);
// Používateľský router
app.use("/users", usersRouter);
// Komentárový router
app.use("/comments", commentsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: "server_error", message: "Niečo sa pokazilo. Skús to znova neskôr." });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});