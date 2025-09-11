// middleware/authRequired.js
module.exports = (req, res, next) => {
  if (!req.user) {
    // Redirect to login with error message query param
    return res.redirect('/login?error=login+to+add+collection');
  }
  next();
};
