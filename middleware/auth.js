const jwtP = require("jsonwebtoken");

exports.isAuthenticated = (req, res, next) => {
  let jwt = req.headers.authorization;
  req.jwt = jwt;

  if (!jwt) {
    return res.status(401).json({
      success: false,
      message: "JWT Authentication Required (Try Logging In)",
    });
  }

  jwt = jwtP.decode(jwt);
  let jwtId;
  if (jwt && jwt.id) {
    jwtId = jwt.id;
  } else {
    jwtId = undefined;
  }

  if (!jwtId) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized to access this resourse (Invalid JWT Token)",
    });
  }

  req.jwtId = jwtId;
  next();
};
