const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

// Middleware na autentifikáciu používateľa
const authenticateUser = require("./authMiddleware");

// Cesta k súboru s komentármi
const commentsFile = path.join(__dirname, "database", "comments.json");
// Cesta k súboru s receptami
const recipesFile = path.join(__dirname, "database", "recipes.json");

// Funkcia na čítanie komentárov z JSON súboru
const readComments = () => {
  if (fs.existsSync(commentsFile)) {
    const data = fs.readFileSync(commentsFile, "utf-8");
    return JSON.parse(data);
  }
  return [];
};

// Funkcia na zapisovanie komentárov do JSON súboru
const writeComments = (comments) => {
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2), "utf-8");
};

// Funkcia na čítanie receptov z JSON súboru
const readRecipes = () => {
  if (fs.existsSync(recipesFile)) {
    const data = fs.readFileSync(recipesFile, "utf-8");
    return JSON.parse(data);
  }
  return [];
};

let comments = readComments(); // Načítanie komentárov zo súboru
const recipes = readRecipes(); // Načítanie receptov zo súboru

// Schéma pre validáciu komentára
const commentSchema = {
  type: "object",
  properties: {
    userId: { type: "string", minLength: 1 },
    recipeId: { type: "string", minLength: 1 },
    comment: { type: "string", minLength: 1 },
  },
  required: ["userId", "recipeId", "comment"],
  additionalProperties: false,
};

// Pridanie nového komentára
router.post("/", authenticateUser, (req, res) => {
  const validate = ajv.compile(commentSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const { recipeId, comment } = req.body;

  // Overenie, či recept existuje
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return res.status(404).json({ code: "not_found", message: "Recept nebol nájdený." });
  }

  // Vytvorenie nového komentára
  const newComment = {
    id: crypto.randomUUID(),
    userId: req.user.id, // Používateľ z middleware
    recipeId,
    comment,
  };
  comments.push(newComment);
  writeComments(comments); // Uloženie do súboru

  res.status(201).json({ message: "Komentár bol úspešne vytvorený.", comment: newComment });
});

// Získanie všetkých komentárov
router.get("/", (req, res) => {
  res.status(200).json(comments);
});

// Získanie komentárov pre konkrétny recept
router.get("/recipe/:recipeId", (req, res) => {
  const { recipeId } = req.params;
  const recipeComments = comments.filter((c) => c.recipeId === recipeId);

  res.status(200).json(recipeComments);
});

// Získanie komentárov od konkrétneho používateľa
router.get("/user/:userId", (req, res) => {
  const { userId } = req.params;
  const userComments = comments.filter((c) => c.userId === userId);

  res.status(200).json(userComments);
});

// Aktualizácia komentára
router.put("/:id", authenticateUser, (req, res) => {
  const validate = ajv.compile(commentSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const index = comments.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Komentár nebol nájdený." });
  }

  comments[index] = { ...comments[index], ...req.body };
  writeComments(comments); // Uloženie do súboru
  res.status(200).json({ message: "Komentár bol úspešne aktualizovaný.", comment: comments[index] });
});

// Odstránenie komentára
router.delete("/:id", authenticateUser, (req, res) => {
  const index = comments.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Komentár nebol nájdený." });
  }

  comments.splice(index, 1);
  writeComments(comments); // Uloženie do súboru
  res.status(200).json({ message: "Komentár bol úspešne zmazaný." });
});

module.exports = router;
