const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

// Definovanie ciesty k súborom s receptami a používateľmi
const recipesFile = path.join(__dirname, "database", "recipes.json");
const usersFile = path.join(__dirname, "database", "users.json");

// Funkcia na čítanie dát zo súboru
const readData = (filePath) => {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
  return [];
};

// FFunkcia na zápis dát do súboru
const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// Čítanie receptov a používateľov zo súborov
let recipes = readData(recipesFile);
let users = readData(usersFile);

// Definovanie schémy pre validáciu receptu
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

// Náhodný recept
router.get("/random", (req, res) => {
  if (recipes.length === 0) {
    return res.status(404).json({ code: "not_found", message: "Žiadne recepty neboli nájdené." });
  }

  const randomIndex = Math.floor(Math.random() * recipes.length);
  const randomRecipe = recipes[randomIndex];
  res.status(200).json(randomRecipe);
});

// Filtrovanie receptov podľa kategórie
router.get("/:category", (req, res) => {
  const { category } = req.params;

  const filteredRecipes = recipes.filter((recipe) => recipe.category === category);

  if (filteredRecipes.length === 0) {
    return res.status(404).json({ code: "not_found", message: `Žiadne recepty v kategórii "${category}" neboli nájdené.` });
  }

  res.status(200).json(filteredRecipes);
});


// Riešenie požiadavky na vytvorenie nového receptu
router.post("/", (req, res) => {
  // VALIDÁCIA: Overenie, či požiadavka obsahuje správne dáta
  const validate = ajv.compile(recipeSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  // Vygenerovanie nového ID pre recept
  const newRecipe = { id: crypto.randomUUID(), ...req.body };
  // Prideanie nového receptu do zoznamu receptov
  recipes.push(newRecipe);
  // Načítanie dát do súboru
  writeData(recipesFile, recipes);
  // Poslanie odpovede s novým receptom
  res.status(201).json({ message: "Recept bol úspešne vytvorený.", recipe: newRecipe });
});
// Riešenie požiadavky na získanie všetkých receptov
router.get("/", (req, res) => {
  res.status(200).json(recipes);
});
// Riešenie požiadavky na získanie receptu podľa ID
router.get("/filter", (req, res) => {
  const { category, ingredients, popularity, difficulty, search, maxPrepTime, page = 1, limit = 10 } = req.query;

  let filteredRecipes = recipes;

  if (category) {
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.category === category);
  }
// Riešenie požiadavky na filtrovanie receptov
  if (ingredients) {
    const ingredientList = ingredients.split(",").map((ing) => ing.trim().toLowerCase());
    filteredRecipes = filteredRecipes.filter((recipe) =>
      ingredientList.every((ing) =>
        recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(ing))
      )
    );
  }
// Riešenie požiadavky na filtrovanie receptov
  if (popularity) {
    const minPopularity = parseFloat(popularity);
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.popularity >= minPopularity);
  }
// Riešenie požiadavky na filtrovanie receptov
  if (difficulty) {
    filteredRecipes = filteredRecipes.filter((recipe) => recipe.difficulty === difficulty);
  }
// Riešenie požiadavky na filtrovanie receptov
  if (search) {
    const keyword = search.toLowerCase();
    filteredRecipes = filteredRecipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(keyword)
    );
  }
// Riešenie požiadavky na filtrovanie receptov
  if (maxPrepTime) {
    const maxTime = parseInt(maxPrepTime, 10);
    filteredRecipes = filteredRecipes.filter((recipe) => {
      const prepTime = parseInt(recipe.prepTime.split(" ")[0], 10);
      return prepTime <= maxTime;
    });
  }
// Riešenie požiadavky na filtrovanie receptov
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
// Riešenie požiadavky na získanie receptu podľa ID
router.delete("/:id", (req, res) => {
  const recipeId = req.params.id;

  const recipeIndex = recipes.findIndex((recipe) => recipe.id === recipeId);
  if (recipeIndex === -1) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }
// Riešenie požiadavky na odstránenie receptu
  recipes.splice(recipeIndex, 1);
  writeData(recipesFile, recipes);

  users.forEach((user) => {
    user.favorites = user.favorites.filter((favId) => favId !== recipeId);
  });
  writeData(usersFile, users);

  res.status(200).json({ message: "Recept bol úspešne zmazaný a odstránený z obľúbených." });
});
// Riešenie požiadavky na získanie receptu podľa ID
router.post("/rate/:recipeId", (req, res) => {
  const { userId, rating } = req.body;
  const recipeId = req.params.recipeId;
// Riešenie požiadavky na pridanie hodnotenia receptu
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.status(404).json({ code: "recipe_not_found", message: "Recept nebol nájdený." });
  }
// Riešenie požiadavky na pridanie hodnotenia receptu
  if (rating < 0 || rating > 5) {
    return res.status(400).json({ code: "invalid_rating", message: "Hodnotenie musí byť medzi 0 a 5." });
  }
// Riešenie požiadavky na pridanie hodnotenia receptu
  if (!recipe.ratings) {
    recipe.ratings = [];
  }
// Riešenie požiadavky na pridanie hodnotenia receptu
  recipe.ratings.push({ userId, rating });
  recipe.popularity = (
    recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
  ).toFixed(2);
// Riešenie požiadavky na pridanie hodnotenia receptu
  writeData(recipesFile, recipes);
  res.status(200).json({ message: "Hodnotenie bolo pridané.", recipe });
});
// Riešenie požiadavky na pridanie receptu do obľúbených
router.put("/favorites/:userId/:recipeId", (req, res) => {
  const userId = req.params.userId;
  const recipeId = req.params.recipeId;
// Riešenie požiadavky na pridanie receptu do obľúbených
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ code: "user_not_found", message: "Používateľ nebol nájdený." });
  }
// Riešenie požiadavky na pridanie receptu do obľúbených
  const recipeExists = recipes.some((r) => r.id === recipeId);
  if (!recipeExists) {
    return res.status(404).json({ code: "recipe_not_found", message: "Recept nebol nájdený." });
  }

  if (!users[userIndex].favorites.includes(recipeId)) {
    users[userIndex].favorites.push(recipeId);
    writeData(usersFile, users);
  }
// Riešenie požiadavky na pridanie receptu do obľúbených
  res.status(200).json({ message: "Recept bol pridaný do obľúbených." });
});
// Riešenie požiadavky na získanie obľúbených receptov
router.get("/favorites/:userId", (req, res) => {
  const userId = req.params.userId;
// Riešenie požiadavky na získanie obľúbených receptov
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ code: "user_not_found", message: "Používateľ nebol nájdený." });
  }
// Riešenie požiadavky na získanie obľúbených receptov
  const favoriteRecipes = recipes.filter((r) => user.favorites.includes(r.id));
  res.status(200).json(favoriteRecipes);
});
// Riešenie požiadavky na získanie štatistík
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