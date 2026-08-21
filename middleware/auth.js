const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verificar token JWT
function verificarToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}

// Gerar token
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { verificarToken, gerarToken };