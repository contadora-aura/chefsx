const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

// Cesta k súborom s receptami a používateľmi
const recipesFile = path.join(__dirname, "database", "recipes.json");
const usersFile = path.join(__dirname, "database", "users.json");

// Funkcie na čítanie/zapisovanie dát zo/z JSON súborov
const readData = (filePath) => {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
  return [];
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

let recipes = readData(recipesFile);
let users = readData(usersFile);

// Schéma pre validáciu receptu (AJV)
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

// Pridanie nového receptu (iba pre prihlásených používateľov)
router.post("/", (req, res) => {
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newRecipe = { id: crypto.randomUUID(), ...req.body };
  recipes.push(newRecipe);
  writeData(recipesFile, recipes); // Uloženie do súboru
  res.status(201).json({ message: "Recept bol úspešne vytvorený.", recipe: newRecipe });
});

// Získanie všetkých receptov (bez filtrovania)
router.get("/", (req, res) => {
  res.status(200).json(recipes);
});

// Filtrovanie receptov podľa rôznych kritérií
router.get("/filter", (req, res) => {
  const { category, ingredients, popularity, difficulty, search, maxPrepTime, page = 1, limit = 10 } = req.query;

  let filteredRecipes = recipes;

  // Filtrovanie podľa kategórie receptu
  if (category) {
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.category === category);
  }

  // Filtrovanie podľa ingrediencií (všetky musia byť v recepte)
  if (ingredients) {
    const ingredientList = ingredients.split(",").map((ing) => ing.trim().toLowerCase());
    filteredRecipes = filteredRecipes.filter((recipe) =>
      ingredientList.every((ing) =>
        recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(ing))
      )
    );
  }

  // Filtrovanie podľa popularity receptu
  if (popularity) {
    const minPopularity = parseFloat(popularity);
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.popularity >= minPopularity);
  }

  // Filtrovanie podľa obtiažnosti receptu
  if (difficulty) {
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.difficulty === difficulty);
  }

  // Vyhľadávanie podľa názvu receptu
  if (search) {
    const keyword = search.toLowerCase();
    filteredRecipes = filteredRecipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(keyword)
    );
  }

  // Filtrovanie podľa času prípravy (maximálny čas)
  if (maxPrepTime) {
    const maxTime = parseInt(maxPrepTime, 10);
    filteredRecipes = filteredRecipes.filter((recipe) => {
      const prepTime = parseInt(recipe.prepTime.split(" ")[0], 10);
      return prepTime <= maxTime;
    });
  }

  // Stránkovanie výsledkov
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);

  res.status(200).json({
    total: filteredRecipes.length,
    page: parseInt(page),
    limit: parseInt(limit),
    recipes: paginatedRecipes,
  });
});

// Hodnotenie receptov (pridanie hodnotenia)
router.post("/rate/:recipeId", (req, res) => {
  const { userId, rating } = req.body;
  const recipeId = req.params.recipeId;

  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.status(404).json({ code: "recipe_not_found", message: "Recept nebol nájdený." });
  }

  if (rating < 0 || rating > 5) {
    return res.status(400).json({ code: "invalid_rating", message: "Hodnotenie musí byť medzi 0 a 5." });
  }

  if (!recipe.ratings) {
    recipe.ratings = [];
  }

  recipe.ratings.push({ userId, rating });
  recipe.popularity = (
    recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
  ).toFixed(2);

  writeData(recipesFile, recipes);
  res.status(200).json({ message: "Hodnotenie bolo pridané.", recipe });
});

// Pridanie receptu do obľúbených pre používateľa
router.put("/favorites/:userId/:recipeId", (req, res) => {
  const userId = req.params.userId;
  const recipeId = req.params.recipeId;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ code: "user_not_found", message: "Používateľ nebol nájdený." });
  }

  const recipeExists = recipes.some((r) => r.id === recipeId);
  if (!recipeExists) {
    return res.status(404).json({ code: "recipe_not_found", message: "Recept nebol nájdený." });
  }

  if (!users[userIndex].favorites.includes(recipeId)) {
    users[userIndex].favorites.push(recipeId);
    writeData(usersFile, users);
  }

  res.status(200).json({ message: "Recept bol pridaný do obľúbených." });
});

// Získanie obľúbených receptov pre používateľa
router.get("/favorites/:userId", (req, res) => {
  const userId = req.params.userId;

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ code: "user_not_found", message: "Používateľ nebol nájdený." });
  }

  const favoriteRecipes = recipes.filter((r) => user.favorites.includes(r.id));
  res.status(200).json(favoriteRecipes);
});

// Štatistiky receptov (počet, podľa kategórií, priemerná popularita)
router.get("/stats", (req, res) => {
  const stats = {
    totalRecipes: recipes.length,
    byCategory: recipes.reduce((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] || 0) + 1;
      return acc;
    }, {}),
    averagePopularity: (
      recipes.reduce((sum, recipe) => sum + recipe.popularity, 0) / recipes.length
    ).toFixed(2),
  };

  res.status(200).json(stats);
});

module.exports = router;
