const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

let users = [];

// Schéma pre validáciu používateľa
const userSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 3 },
    email: { type: "string", format: "email" },
    favorites: { type: "array", items: { type: "string" } },
  },
  required: ["name", "email"],
  additionalProperties: false,
};

// Pridávanie používateľov
router.post("/", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ code: "validation_error", message: "Chýba meno alebo email." });
  }

  const newUser = { id: crypto.randomUUID(), name, email, favorites: [] };
  users.push(newUser);
  res.status(201).json({ message: "Používateľ bol úspešne vytvorený.", user: newUser });
});

// Získanie používateľov
router.get("/", (req, res) => {
  res.status(200).json(users);
});

// Získanie používateľa podľa ID
router.get("/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ code: "not_found", message: "Používateľ nebol nájdený." });
  }
  res.status(200).json(user);
});

// Aktualizácia používateľa (pridanie obľúbených receptov)
router.put("/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ code: "not_found", message: "Používateľ nebol nájdený." });
  }

  const { favorites } = req.body;
  if (!Array.isArray(favorites)) {
    return res.status(400).json({ code: "validation_error", message: "Favorites musí byť pole." });
  }

  user.favorites = [...new Set([...user.favorites, ...favorites])];
  res.status(200).json({ message: "Používateľ bol úspešne aktualizovaný.", user });
});

// Odstránenie používateľa
router.delete("/:id", (req, res) => {
  const index = users.findIndex((u) => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Používateľ nebol nájdený." });
  }

  users.splice(index, 1);
  res.status(200).json({ message: "Používateľ bol úspešne zmazaný." });
});

module.exports = router;
