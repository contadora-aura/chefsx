const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Ajv = require("ajv");
const app = express();
const ajv = new Ajv();

// Importovanie logiky pre používateľov
const usersRouter = require("./users.js");

const port = 8000;

let recipes = [];
let comments = [];

app.use(cors());
app.use(express.json());

// Schéma pre validáciu vstupu receptu
const recipeSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 3 },
    category: { type: "string", enum: ["Polievky", "Hlavné jedlá", "Dezerty"] },
    ingredients: { type: "array", items: { type: "string" }, minItems: 1 },
    steps: { type: "array", items: { type: "string" }, minItems: 1 },
    prepTime: { type: "string" },
    difficulty: { type: "string", enum: ["Jednoduchá", "Stredná", "Ťažká"] },
    popularity: { type: "number", minimum: 0, maximum: 5 },
    image: { type: "string" },
  },
  required: ["name", "category", "ingredients", "steps", "prepTime", "difficulty"],
  additionalProperties: false,
};

// CRUD operácie pre recepty
app.post("/recipes", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newRecipe = { id: crypto.randomUUID(), ...req.body };
  recipes.push(newRecipe);
  res.status(201).json({ message: "Recept bol úspešne vytvorený.", recipe: newRecipe });
});

app.get("/recipes", (req, res) => {
  res.status(200).json(recipes);
});

app.get("/recipes/:id", (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }
  res.status(200).json(recipe);
});

app.put("/recipes/:id", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }

  recipes[index] = { ...recipes[index], ...req.body };
  res.status(200).json({ message: "Recept bol úspešne aktualizovaný.", recipe: recipes[index] });
});

app.delete("/recipes/:id", (req, res) => {
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }

  recipes.splice(index, 1);
  res.status(200).json({ message: "Recept bol úspešne zmazaný." });
});

// Pridávanie komentárov k receptom
app.post("/recipes/:id/comments", (req, res) => {
  const { text, userId } = req.body;
  if (!text || !userId) {
    return res.status(400).json({ code: "validation_error", message: "Chýba text alebo používateľ ID." });
  }

  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }

  const newComment = { id: crypto.randomUUID(), recipeId: req.params.id, userId, text, createdAt: new Date() };
  comments.push(newComment);
  res.status(201).json({ message: "Komentár bol úspešne pridaný.", comment: newComment });
});

app.get("/recipes/:id/comments", (req, res) => {
  const recipeComments = comments.filter((c) => c.recipeId === req.params.id);
  res.status(200).json(recipeComments);
});

// Používateľský router
app.use("/users", usersRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: "server_error", message: "Niečo sa pokazilo. Skús to znova." });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
