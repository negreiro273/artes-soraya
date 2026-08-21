const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const db = require('./config/database');
const { verificarToken, gerarToken } = require('./middleware/auth');
const { error } = require('console');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Garantir pastas
['uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// =================== CONFIGURAÇÃO DO UPLOAD ===================
// Upload de imagens - PRIMEIRO declaramos o storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

// Upload simples (para banners)
const upload = multer({ storage });

// Upload múltiplo de imagens (até 3) - DEPOIS usamos o storage já declarado
const uploadMultiple = multer({ 
  storage: storage,
  limits: { files: 3 }
});

// =================== AUTENTICAÇÃO ===================

// Login
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

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Verificar sessão
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
// PUT categoria com ícone
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
    
    const imagem1 = imagens[0] ? '/uploads/' + imagens[0].filename : '';
    const imagem2 = imagens[1] ? '/uploads/' + imagens[1].filename : '';
    const imagem3 = imagens[2] ? '/uploads/' + imagens[2].filename : '';
    
    const result = await db.query(
      `INSERT INTO produtos (nome, descricao, valor, categoria_id, imagem, imagem2, imagem3) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, descricao, valor, categoriaId || null, imagem1, imagem2, imagem3]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/produtos/:id', verificarToken, uploadMultiple.array('imagens', 3), async (req, res) => {
  try {
    const { nome, descricao, valor, categoriaId } = req.body;
    const imagens = req.files || [];
    
    // Buscar produto atual para manter imagens existentes se não enviar novas
    const atual = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    const produtoAtual = atual.rows[0];
    
    const imagem1 = imagens[0] ? '/uploads/' + imagens[0].filename : produtoAtual.imagem;
    const imagem2 = imagens[1] ? '/uploads/' + imagens[1].filename : produtoAtual.imagem2;
    const imagem3 = imagens[2] ? '/uploads/' + imagens[2].filename : produtoAtual.imagem3;
    
    await db.query(
      `UPDATE produtos SET nome=$1, descricao=$2, valor=$3, categoria_id=$4, 
       imagem=$5, imagem2=$6, imagem3=$7 WHERE id=$8`,
      [nome, descricao, valor, categoriaId || null, imagem1, imagem2, imagem3, req.params.id]
    );
    
    const result = await db.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
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
    const result = await db.query('SELECT * FROM banners ORDER BY ordem');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/banners', verificarToken, upload.single('imagem'), async (req, res) => {
  try {
    const { titulo } = req.body;
    const imagem = '/uploads/' + req.file.filename;
    const result = await db.query(
      'INSERT INTO banners (titulo, imagem) VALUES ($1, $2) RETURNING *',
      [titulo, imagem]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', verificarToken, async (req, res) => {
  try {
    await db.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


//=====================PEDIDOS===========================
app.post('/api/pedidos/finalizar', async (req, res) => {
  try {
    const { nomecliente, contatocliente, produtos } = req.body;
    
    // Gerar numos único para todo o pedido
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

// Rota para consultar todos os pedidos (para o admin)
// =================== PEDIDOS ===================

// Listar todos os pedidos (ADMIN)
app.get('/api/pedidos', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.numos,
        p.nomecliente,
        p.contatocliente,
        p.produto_id,
        p.imagem_produto,
        pr.nome as nome_produto,
        pr.valor,
        pr.imagem as imagem_original,
        p.datapedido,
        p.datafimpedido,
        p.situacaopedido
      FROM pedidos p
      LEFT JOIN produtos pr ON p.produto_id = pr.id
      ORDER BY p.datapedido DESC
    `);
    
    // IMPORTANTE: Retornar o array diretamente, não { pedidos: result.rows }
    res.json(result.rows);
    
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rota para atualizar situação do pedido
app.put('/api/pedidos/:numos/situacao', verificarToken, async (req, res) => {
  try {
    const { situacaopedido } = req.body;
    
    let datafim = null;
    if (situacaopedido == 3) {
      datafim = new Date();
    }
    
    const result = await db.query(
      `UPDATE pedidos 
       SET situacaopedido = $1, 
           datafimpedido = $2 
       WHERE numos = $3 
       RETURNING *`,
      [situacaopedido, datafim, req.params.numos]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Rota para testar se imagem existe
app.get('/api/test-imagem/:nome', (req, res) => {
  const caminhoImagem = path.join(__dirname, 'uploads', req.params.nome);
  console.log('Tentando acessar:', caminhoImagem);
  
  if (fs.existsSync(caminhoImagem)) {
    res.json({ existe: true, caminho: `/uploads/${req.params.nome}` });
  } else {
    res.json({ existe: false, caminho: caminhoImagem });
  }
});

// =================== EXCLUIR PEDIDO ===================
app.delete('/api/pedidos/:numos', verificarToken, async (req, res) => {
  try {
    const { numos } = req.params;
    
    // Excluir todos os registros com esse número de OS
    const result = await db.query(
      'DELETE FROM pedidos WHERE numos = $1',
      [numos]
    );
    
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
/*
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(` Site: http://localhost:${PORT}`);
  console.log(`🔧 Admin: http://localhost:${PORT}/login.html`);
  console.log(`\n📋 Credenciais padrão:`);
  console.log(`   Email: admin@artesdasoraya.com`);
  console.log(`   Senha: admin123\n`);
});
*/