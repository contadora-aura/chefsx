const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Ajv = require("ajv");
const ajv = new Ajv();

let comments = [];

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

// CRUD operácie pre komentáre
router.post("/", (req, res) => {
  const validate = ajv.compile(commentSchema);
  if (!validate(req.body)) {
    return res.status(400).json({ code: "validation_error", errors: validate.errors });
  }

  const newComment = { id: crypto.randomUUID(), ...req.body };
  comments.push(newComment);
  res.status(201).json({ message: "Komentár bol úspešne vytvorený.", comment: newComment });
});

router.get("/", (req, res) => {
  res.status(200).json(comments);
});

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
  res.status(200).json({ message: "Komentár bol úspešne aktualizovaný.", comment: comments[index] });
});

router.delete("/:id", (req, res) => { 
    const index = comments.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ code: "not_found", message: "Komentár nebol nájdený." });
    }

    comments.splice(index, 1);
    res.status(200).json({ message: "Komentár bol úspešne zmazaný." });
});

module.exports = router;