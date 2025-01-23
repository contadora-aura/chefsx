const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

// Cesta k súboru s komentármi
const commentsFile = path.join(__dirname, "database", "comments.json");

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

let comments = readComments(); // Načítanie komentárov zo súboru

// Schéma pre validáciu komentára
const commentSchema = {
  type: "object",
  properties: {
    userId: { type: "string", minLength: 1 },
    comment: { type: "string", minLength: 1 },
  },
  required: ["userId", "comment"],
  additionalProperties: false,
};

// Schéma pre čiastočnú aktualizáciu komentára
const partialCommentSchema = {
  type: "object",
  properties: {
    userId: { type: "string", minLength: 1 },
    comment: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

// Pridanie nového komentára
router.post("/", (req, res) => {
  const validate = ajv.compile(commentSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newComment = { id: crypto.randomUUID(), ...req.body };
  comments.push(newComment);
  writeComments(comments); // Uloženie do súboru
  res.status(201).json({ message: "Komentár bol úspešne vytvorený.", comment: newComment });
});

// Získanie všetkých komentárov
router.get("/", (req, res) => {
  res.status(200).json(comments);
});

// Získanie komentára podľa ID
router.get("/:id", (req, res) => {
  const comment = comments.find((c) => c.id === req.params.id);
  if (!comment) {
    return res.status(404).json({ code: "not_found", message: "Komentár nebol nájdený." });
  }
  res.status(200).json(comment);
});

// Aktualizácia komentára
router.put("/:id", (req, res) => {
  const validate = ajv.compile(partialCommentSchema);
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
router.delete("/:id", (req, res) => {
  const index = comments.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ code: "not_found", message: "Komentár nebol nájdený." });
  }

  comments.splice(index, 1);
  writeComments(comments); // Uloženie do súboru
  res.status(200).json({ message: "Komentár bol úspešne zmazaný." });
});

module.exports = router;