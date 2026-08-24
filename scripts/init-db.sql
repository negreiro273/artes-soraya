-- Criar banco de dados (execute manualmente no PostgreSQL se necessário)
-- CREATE DATABASE artes_da_soraya;

-- Tabela de usuários admin
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(100) NOT NULL UNIQUE,
  icone VARCHAR(50) DEFAULT 'fa-box',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,  
  nome VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  imagem VARCHAR(500),
  imagem2 VARCHAR(500),
  imagem3 VARCHAR(500),  
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numos INTEGER 
  nomecliente VARCHAR(200) NOT NULL,
  contatocliente VARCHAR(20) NOT NULL,  
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  datapedido TIMESTAMP NOT NULL,
  datafimpedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  situacaopedido INTEGER DEFAULT 0,
  imagem_produto VARCHAR(500)

);


-- Tabela de banners
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(100),
  imagem VARCHAR(500) NOT NULL,
  ordem INTEGER DEFAULT 0,
  contato VARCHAR(15) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão (senha: admin123)
-- O hash será gerado pelo script init-db.js
INSERT INTO usuarios (nome, email, senha)
VALUES ('Administrador', 'admin@artesdasoraya.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (email) DO NOTHING;