require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const db = require('./config/database');
const { verificarToken, gerarToken } = require('./middleware/auth');

// =================== CONFIGURAÇÃO DO CLOUDINARY ===================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


console.log('🔧 Configurando Cloudinary...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'NÃO CONFIGURADA');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// Testar se a configuração funcionou
try {
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error('❌ ERRO AO CONECTAR COM CLOUDINARY:', error.message);
    } else {
      console.log('✅ Cloudinary conectado com sucesso!');
    }
  });
} catch (err) {
  console.error('❌ Erro ao testar Cloudinary:', err);
}
// Configuração do armazenamento no Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'artes-da-soraya', // Nome da pasta no seu Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg'],
  },
});

const upload = multer({ storage: storage });
const uploadMultiple = multer({ 
  storage: storage,
  limits: { files: 3 }
});

// =================== INICIALIZAÇÃO DO APP ===================
const app = express();
const PORT = process.env.PORT || 3000;

// =================== MIDDLEWARES ===================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos do frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =================== AUTENTICAÇÃO ===================
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const token = gerarToken(usuario);
    res.cookie('token', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', verificarToken, (req, res) => {
  res.json({ usuario: req.usuario });
});

// =================== CATEGORIAS ===================
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categorias ORDER BY descricao');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categorias', verificarToken, async (req, res) => {
  try {
    const { descricao, icone } = req.body;
    const result = await db.query(
      'INSERT INTO categorias (descricao, icone) VALUES ($1, $2) RETURNING *',
      [descricao, icone || 'fa-box']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categorias/:id', verificarToken, async (req, res) => {
  try {
    const { descricao, icone } = req.body;
    const result = await db.query(
      'UPDATE categorias SET descricao = $1, icone = $2 WHERE id = $3 RETURNING *',
      [descricao, icone || 'fa-box', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categorias/:id', verificarToken, async (req, res) => {
  try {
    await db.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== PRODUTOS ===================
app.get('/api/produtos', async (req, res) => {
  try {
    const { categoria, busca } = req.query;
    let query = `
      SELECT p.*, c.descricao as categoria_nome 
      FROM produtos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      params.push(categoria);
      query += ` AND p.categoria_id = $${params.length}`;
    }
    if (busca) {
      params.push(`%${busca.toLowerCase()}%`);
      query += ` AND (LOWER(p.nome) LIKE $${params.length} OR LOWER(p.descricao) LIKE $${params.length})`;
    }

    query += ' ORDER BY p.criado_em DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/produtos/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, c.descricao as categoria_nome 
       FROM produtos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.id = $1`,
      [req.params.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produtos', verificarToken, uploadMultiple.array('imagens', 3), async (req, res) => {
  try {
    const { nome, descricao, valor, categoriaId } = req.body;
    const imagens = req.files || [];
    
    // O Cloudinary retorna a URL completa em req.file.path
    const imagem1 = imagens[0] ? imagens[0].path : '';
    const imagem2 = imagens[1] ? imagens[1].path : '';
    const imagem3 = imagens[2] ? imagens[2].path : '';
    
    const result = await db.query(
      `INSERT INTO produtos (nome, descricao, valor, categoria_id, imagem, imagem2, imagem3) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, descricao, valor, categoriaId || null, imagem1, imagem2, imagem3]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/produtos/:id', verificarToken, uploadMultiple.array('imagens', 3), async (req, res) => {
  try {
    const { nome, descricao, valor, categoriaId } = req.body;
    const imagens = req.files || [];
    
    const atual = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    const produtoAtual = atual.rows[0];
    
    // Se enviar nova imagem, usa a URL do Cloudinary, senão mantém a antiga
    const imagem1 = imagens[0] ? imagens[0].path : produtoAtual.imagem;
    const imagem2 = imagens[1] ? imagens[1].path : produtoAtual.imagem2;
    const imagem3 = imagens[2] ? imagens[2].path : produtoAtual.imagem3;
    
    await db.query(
      `UPDATE produtos SET nome=$1, descricao=$2, valor=$3, categoria_id=$4, 
       imagem=$5, imagem2=$6, imagem3=$7 WHERE id=$8`,
      [nome, descricao, valor, categoriaId || null, imagem1, imagem2, imagem3, req.params.id]
    );
    
    const result = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/produtos/:id', verificarToken, async (req, res) => {
  try {
    await db.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== BANNERS ===================
app.get('/api/banners', async (req, res) => {
  try {
    // Garantimos que 'contato' e 'imagem' (URL do Cloudinary) sejam buscados
    const result = await db.query('SELECT id, titulo, imagem, contato, ordem FROM banners ORDER BY ordem');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/*

app.post('/api/banners', verificarToken, upload.single('imagem'), async (req, res) => {
  try {
    const { titulo, contato } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }
    
    // req.file.path contém a URL HTTPS direta do Cloudinary
    const imagemUrl = req.file.path; 
    
    const result = await db.query(
      'INSERT INTO banners (titulo, imagem, contato) VALUES ($1, $2, $3) RETURNING *',
      [titulo, imagemUrl, contato]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
*/

app.post('/api/banners', verificarToken, upload.single('imagem'), async (req, res) => {
  try {
    console.log('📥 Recebendo upload de banner...');
    console.log('📁 Arquivo:', req.file);
    console.log('📝 Body:', req.body);
    
    const { titulo, contato } = req.body;
    
    if (!req.file) {
      console.error(' Nenhum arquivo enviado!');
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }
    
    const imagemUrl = req.file.path;
    console.log('✅ Imagem enviada para:', imagemUrl);
    
    const result = await db.query(
      'INSERT INTO banners (titulo, imagem, contato) VALUES ($1, $2, $3) RETURNING *',
      [titulo, imagemUrl, contato]
    );
    
    console.log('✅ Banner salvo no banco!');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ ERRO AO SALVAR BANNER:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', verificarToken, async (req, res) => {
  try {
    // Opcional: Aqui você poderia adicionar uma chamada ao cloudinary.uploader.destroy() 
    // para deletar a imagem da nuvem também, mas por enquanto vamos só remover do banco.
    await db.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== PEDIDOS ===================
app.post('/api/pedidos/finalizar', async (req, res) => {
  try {
    const { nomecliente, contatocliente, produtos } = req.body;
    
    const seqResult = await db.query("SELECT nextval('os_seq') as numos");
    const numosGeral = seqResult.rows[0].numos;
    
    const pedidosCriados = [];
    
    for (const produto of produtos) {
      const result = await db.query(
        `INSERT INTO pedidos (numos, nomecliente, contatocliente, produto_id, datapedido, situacaopedido, imagem_produto) 
         VALUES ($1, $2, $3, $4, NOW(), 0, $5) 
         RETURNING *`,
        [numosGeral, nomecliente, contatocliente, produto.id, produto.imagem]
      );
      pedidosCriados.push(result.rows[0]);
    }
    
    res.json({
      sucesso: true,
      numos: numosGeral,
      pedidos: pedidosCriados,
      totalProdutos: pedidosCriados.length
    });
    
  } catch (err) {
    console.error('Erro ao criar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pedidos', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id, p.numos, p.nomecliente, p.contatocliente, p.produto_id,
        p.imagem_produto, pr.nome as nome_produto, pr.valor,
        pr.imagem as imagem_original, p.datapedido, p.datafimpedido, p.situacaopedido
      FROM pedidos p
      LEFT JOIN produtos pr ON p.produto_id = pr.id
      ORDER BY p.datapedido DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pedidos/:numos/situacao', verificarToken, async (req, res) => {
  try {
    const { situacaopedido } = req.body;
    let datafim = situacaopedido == 3 ? new Date() : null;
    
    const result = await db.query(
      `UPDATE pedidos SET situacaopedido = $1, datafimpedido = $2 WHERE numos = $3 RETURNING *`,
      [situacaopedido, datafim, req.params.numos]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pedidos/:numos', verificarToken, async (req, res) => {
  try {
    const { numos } = req.params;
    const result = await db.query('DELETE FROM pedidos WHERE numos = $1', [numos]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json({ 
      success: true, 
      message: `Pedido OS #${numos} excluído com sucesso`,
      rowsDeleted: result.rowCount 
    });
  } catch (err) {
    console.error('Erro ao excluir pedido:', err);
    res.status(500).json({ error: err.message });
  }
});

// =================== INICIALIZAÇÃO ===================
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌐 Site: http://localhost:${PORT}`);
  console.log(`🔧 Admin: http://localhost:${PORT}/login.html`);
  console.log(`\n📋 Credenciais padrão:`);
  //console.log(`   Email: admin@artesdasoraya.com`);
  //console.log(`   Senha: admin123\n`);
});