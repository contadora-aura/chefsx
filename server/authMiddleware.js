const users = require("./database/users.json"); // Načítanie používateľov zo súboru

const authenticateUser = (req, res, next) => {
  const { userId } = req.body; // Môže byť aj v req.headers alebo req.query

  if (!userId) {
    return res.status(401).json({ code: "unauthorized", message: "Používateľ nie je prihlásený." });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ code: "unauthorized", message: "Neplatný používateľ." });
  }

  req.user = user; // Pridanie používateľa do požiadavky
  next();
};

module.exports = authenticateUser;
