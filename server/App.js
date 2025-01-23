// app.js
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Ajv = require("ajv");
const app = express();
const ajv = new Ajv();

const port = 8000;

let recipes = [];

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

// Vytvorenie receptu
app.post("/recipes", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newRecipe = { id: crypto.randomUUID(), ...req.body };
  recipes.push(newRecipe);
  res.status(201).json({ message: "Recipe successfully created", recipe: newRecipe });
});

// Výpis všetkých receptov
app.get("/recipes", (req, res) => {
  res.status(200).json(recipes);
});

// Výpis receptu podľa ID
app.get("/recipes/:id", (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ code: "not_found", message: "Recipe not found" });
  }
  res.status(200).json(recipe);
});

// Aktualizácia receptu podľa ID
app.put("/recipes/:id", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Recipe not found" });
  }

  recipes[index] = { ...recipes[index], ...req.body };
  res.status(200).json({ message: "Recipe successfully updated", recipe: recipes[index] });
});

// Zmazanie receptu podľa ID
app.delete("/recipes/:id", (req, res) => {
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Recipe not found" });
  }

  recipes.splice(index, 1);
  res.status(200).json({ message: "Recipe successfully deleted" });
});

// Filtrovanie rec
app.get("/recipes/search", (req, res) => {
  const { category, ingredient } = req.query;

  let filteredRecipes = recipes;

  if (category) {
    filteredRecipes = filteredRecipes.filter((r) => r.category === category);
  }

  if (ingredient) {
    filteredRecipes = filteredRecipes.filter((r) => r.ingredients.includes(ingredient));
  }

  res.status(200).json(filteredRecipes);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: "server_error", message: "Something went wrong. Please try again later." });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
