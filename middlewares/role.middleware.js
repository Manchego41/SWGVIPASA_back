// middlewares/role.middleware.js
const roleMiddleware = (roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'No autorizado para este recurso' });
      }
      next();
    };
  };
  
  module.exports = roleMiddleware;  