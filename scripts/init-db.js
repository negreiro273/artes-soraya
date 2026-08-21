const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  try {
    // Ler e executar o script SQL
    const sqlPath = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Executar apenas as criações de tabela (sem o INSERT de usuário)
    const sqlTables = sql.split('-- Inserir usuário')[0];
    await db.query(sqlTables);
    console.log('✅ Tabelas criadas com sucesso!');

    // Criar usuário admin padrão
    const email = 'admin@artesdasoraya.com';
    const senha = 'admin123';
    const hash = await bcrypt.hash(senha, 10);

    const existente = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length === 0) {
      await db.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
        ['Administrador', email, hash]
      );
      console.log('✅ Usuário admin criado:');
      console.log('   Email: admin@artesdasoraya.com');
      console.log('   Senha: admin123');
    } else {
      console.log('️  Usuário admin já existe.');
    }

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err);
    process.exit(1);
  }
}

initDatabase();