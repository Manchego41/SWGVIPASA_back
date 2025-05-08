// controllers/user.controller.js
exports.getProfile = (req, res) => {
    res.json({ message: 'Perfil de usuario accedido con éxito', user: req.user });
  };  