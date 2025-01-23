const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

let recipes = [];

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
router.post("/", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newRecipe = { id: crypto.randomUUID(), ...req.body };
  recipes.push(newRecipe);
  res.status(201).json({ message: "Recept bol úspešne vytvorený.", recipe: newRecipe });
});

router.get("/", (req, res) => {
  res.status(200).json(recipes);
});

router.get("/:id", (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }
  res.status(200).json(recipe);
});

router.put("/:id", (req, res) => {
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

router.delete("/:id", (req, res) => {
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }

  recipes.splice(index, 1);
  res.status(200).json({ message: "Recept bol úspešne zmazaný." });
});

module.exports = router;