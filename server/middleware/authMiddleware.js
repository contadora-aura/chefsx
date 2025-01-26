const path = require("path");	
const users = require(path.join(__dirname, '../database/users.json'));

const authenticateUser = (req, res, next) => {
  console.log("Request body:", req.body); // Logovanie požiadavky
  console.log("Request headers:", req.headers); // Logovanie hlavičiek

  const userId = req.body.userId || req.headers['x-user-id']; // Podpora pre hlavičky

  if (!userId) {
    req.user = null; // Ak chýba userId, používateľ nie je autentifikovaný
    return next(); // Pokračovanie bez overenia
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    req.user = null; // Ak používateľ neexistuje, nastavíme null
    return next(); // Pokračovanie bez overenia
  }

  req.user = user; // Pridanie používateľa do požiadavky
  next(); // Pokračovanie na ďalší middleware alebo router
};

module.exports = authenticateUser;