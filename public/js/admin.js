// Variáveis globais
let categorias = [];
let iconeSelecionado = 'fa-box';
let token = localStorage.getItem('token');
let usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

// Verificar autenticação ao carregar
if (!token) {
  window.location.href = '/login.html';
}

// Mostrar nome do usuário
if (usuario.nome) {
  const elUsuarioNome = document.getElementById('usuarioNome');
  if (elUsuarioNome) {
    elUsuarioNome.textContent = `👤 ${usuario.nome}`;
  }
}

// Headers padrão com token
function getHeaders() {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// =================== INICIALIZAÇÃO ===================
document.addEventListener('DOMContentLoaded', () => {
  carregarCategorias();
  carregarProdutos();
  carregarBanners();
  carregarPedidosAdmin(); 
});

// =================== TABS ===================
function mostrarTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (btn) btn.classList.add('active');
}

// =================== CATEGORIAS ===================
async function carregarCategorias() {
  try {
    const res = await fetch('/api/categorias');
    if (!res.ok) throw new Error('Erro ao carregar categorias');
    categorias = await res.json();
    renderizarCategorias();
    atualizarSelectCategorias();
  } catch (err) {
    console.error('Erro:', err);
    
     mostrarNotificacao(
        'Erro', 
          err || 'ao carregar categorias.', 
        'error'
      );
  }
}

function renderizarCategorias() {
  const div = document.getElementById('listaCategorias');
  if (!div) return;
  
  if (categorias.length === 0) {
    div.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Nenhuma categoria cadastrada.</p>';
    return;
  }
  
  div.innerHTML = categorias.map(c => `
    <div class="item-admin">
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas ${c.icone || 'fa-box'}" style="font-size: 1.5rem; color: var(--primary); width: 30px;"></i>
        <div>
          <strong>${c.descricao}</strong>
          <br>
          <small style="color:#666;">Código: ${c.id}</small>
        </div>
      </div>
      <div class="acoes">
        <button class="btn-editar" onclick="editarCategoria(${c.id})">✏️ Editar</button>
        <button class="btn-excluir" onclick="excluirCategoria(${c.id})">️ Excluir</button>
      </div>
    </div>
  `).join('');
}

function atualizarSelectCategorias() {
  const sel = document.getElementById('prodCategoria');
  if (!sel) return;
  
  sel.innerHTML = '<option value="">Selecione a Categoria</option>' +
    categorias.map(c => `<option value="${c.id}">${c.descricao}</option>`).join('');
}

// Função para selecionar ícone
function selecionarIcone(icone) {
  iconeSelecionado = icone;
  const inputIcone = document.getElementById('catIcone');
  if (inputIcone) {
    inputIcone.value = icone;
  }
  
  // Atualizar visual
  document.querySelectorAll('.icone-item').forEach(item => {
    item.classList.remove('selected');
    if (item.dataset.icone === icone) {
      item.classList.add('selected');
    }
  });
}

// Editar categoria
function editarCategoria(id) {
  const cat = categorias.find(c => c.id === id);
  if (!cat) return;
  
  document.getElementById('catId').value = cat.id;
  document.getElementById('catDescricao').value = cat.descricao;
  
  // Selecionar o ícone visualmente
  if (cat.icone) {
    selecionarIcone(cat.icone);
  }
  
  // Scroll para o formulário
  document.getElementById('formCategoria').scrollIntoView({ behavior: 'smooth' });
}

// Limpar formulário de categoria
function limparFormCategoria() {
  document.getElementById('formCategoria').reset();
  document.getElementById('catId').value = '';
  document.getElementById('catIcone').value = 'fa-box';
  iconeSelecionado = 'fa-box';
  document.querySelectorAll('.icone-item').forEach(item => {
    item.classList.remove('selected');
  });
}

// Submit do formulário de categoria
document.getElementById('formCategoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('catId').value;
  const descricao = document.getElementById('catDescricao').value;
  const icone = document.getElementById('catIcone').value || 'fa-box';
  
  try {
    const url = id ? `/api/categorias/${id}` : '/api/categorias';
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method: method,
      headers: getHeaders(),
      body: JSON.stringify({ descricao, icone })
    });
    
    if (!res.ok) throw new Error('Erro ao salvar categoria');
    
    limparFormCategoria();
    await carregarCategorias();
    
    mostrarNotificacao(
        'Categoria', 
        `Salva com Sucesso!`, 
        'success'
      );
  } catch (err) {
    console.error(err);
    
       mostrarNotificacao(
        'Erro', 
          err || 'Erro ao salvar categoria.', 
        'error'
      );
  }
});

// Excluir categoria
async function excluirCategoria(id) {
  if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
  
  try {
    const res = await fetch(`/api/categorias/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao excluir categoria');
    
    await carregarCategorias();
    
       mostrarNotificacao(
        'Categoria', 
        `excluída com Sucesso!`, 
        'success'
      );
  } catch (err) {
    console.error(err);
      mostrarNotificacao(
        'Erro', 
          err || 'Erro ao excluir categoria.', 
        'error'
      );
  }
}

// =================== PRODUTOS ===================
async function carregarProdutos() {
  try {
    const res = await fetch('/api/produtos');
    if (!res.ok) throw new Error('Erro ao carregar produtos');
    const produtos = await res.json();
    renderizarProdutos(produtos);
  } catch (err) {
    console.error('Erro:', err);
  }
}

function renderizarProdutos(produtos) {
  const div = document.getElementById('listaProdutos');
  if (!div) return;
  
  if (produtos.length === 0) {
    div.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Nenhum produto cadastrado.</p>';
    return;
  }
  
  div.innerHTML = produtos.map(p => {
    const cat = categorias.find(c => c.id == p.categoria_id);
    return `
      <div class="item-admin">
        <img src="${p.imagem || 'https://via.placeholder.com/300?text=Sem+Imagem'}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/300?text=Imagem+não+encontrada'">
        <strong>${p.nome}</strong>
        <p>${cat ? cat.descricao : 'Sem categoria'}</p>
        <p style="color:var(--accent);font-weight:bold;">R$ ${parseFloat(p.valor).toFixed(2).replace('.', ',')}</p>
        <div class="acoes">
          <button class="btn-editar" onclick='editarProduto(${JSON.stringify(p).replace(/'/g, "\\'")})'>✏️ Editar</button>
          <button class="btn-excluir" onclick="excluirProduto(${p.id})">🗑️ Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

// Submit do formulário de produto
document.getElementById('formProduto').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('prodId').value;
  const formData = new FormData();
  
  formData.append('nome', document.getElementById('prodNome').value);
  formData.append('descricao', document.getElementById('prodDescricao').value);
  formData.append('valor', document.getElementById('prodValor').value);
  formData.append('categoriaId', document.getElementById('prodCategoria').value);
  
  // Adicionar até 3 imagens
  const img1 = document.getElementById('prodImagem1').files[0];
  const img2 = document.getElementById('prodImagem2').files[0];
  const img3 = document.getElementById('prodImagem3').files[0];
  
  if (img1) formData.append('imagens', img1);
  if (img2) formData.append('imagens', img2);
  if (img3) formData.append('imagens', img3);

  try {
    const url = id ? `/api/produtos/${id}` : '/api/produtos';
    const method = id ? 'PUT' : 'POST';
    
    // Headers para upload não devem incluir Content-Type (o browser define automaticamente)
    const headers = { 'Authorization': `Bearer ${token}` };
    
    const res = await fetch(url, {
      method: method,
      headers: headers,
      body: formData
    });
    
    if (!res.ok) throw new Error('Erro ao salvar produto');
    
    limparFormProduto();
    await carregarProdutos();
    //alert('Produto salvo com sucesso!');
   mostrarNotificacao(
        'Produto', 
        `Salvo com Sucesso!`, 
        'success'
      );
  } catch (err) {
    console.error(err);
    //alert('Erro ao salvar produto. Verifique o console.');
      mostrarNotificacao(
        'Erro', 
          err || 'Erro ao salvar produto', 
        'error'
      );
  }
});

function editarProduto(p) {
  document.getElementById('prodId').value = p.id;
  document.getElementById('prodNome').value = p.nome;
  document.getElementById('prodDescricao').value = p.descricao;
  document.getElementById('prodValor').value = p.valor;
  document.getElementById('prodCategoria').value = p.categoria_id;
  
  // Limpar campos de imagem ao editar
  document.getElementById('prodImagem1').value = '';
  document.getElementById('prodImagem2').value = '';
  document.getElementById('prodImagem3').value = '';
  
  // Scroll para o formulário
  document.getElementById('formProduto').scrollIntoView({ behavior: 'smooth' });
}

function limparFormProduto() {
  document.getElementById('formProduto').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('prodImagem1').value = '';
  document.getElementById('prodImagem2').value = '';
  document.getElementById('prodImagem3').value = '';
}

async function excluirProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  
  try {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao excluir produto');
    
    await carregarProdutos();

       mostrarNotificacao(
        'Produto', 
        `excluído com Sucesso!`, 
        'success'
      );
  } catch (err) {
    console.error(err);

   mostrarNotificacao(
        'Erro', 
          err || 'Erro ao Excluir Produto.', 
        'error'
      );
  }
}

// =================== BANNERS ===================
async function carregarBanners() {
  try {
    const res = await fetch('/api/banners');
    if (!res.ok) throw new Error('Erro ao carregar banners');
    const banners = await res.json();
    renderizarBanners(banners);
  } catch (err) {
    console.error('Erro:', err);
  }
}

function renderizarBanners(banners) {
  const div = document.getElementById('listaBanners');
  if (!div) return;
  
  if (banners.length === 0) {
    div.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Nenhum banner cadastrado.</p>';
    return;
  }
  
  div.innerHTML = banners.map(b => `
    <div class="item-admin">
      <img src="${b.imagem}" alt="${b.titulo || 'Banner'}" onerror="this.src='https://via.placeholder.com/300?text=Imagem+não+encontrada'">
      <p>${b.titulo || 'Sem título'}</p>
      <div class="acoes">
        <button class="btn-excluir" onclick="excluirBanner(${b.id})">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

// Submit do formulário de banner
document.getElementById('formBanner').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('titulo', document.getElementById('bannerTitulo').value);
  formData.append('contato', document.getElementById('bannerContato').value);
  const imagem = document.getElementById('bannerImagem').files[0];
  
  if (imagem) {
    formData.append('imagem', imagem);
  }
  
  try {
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    if (!res.ok) throw new Error('Erro ao salvar banner');
    
    document.getElementById('formBanner').reset();
    await carregarBanners();
       mostrarNotificacao(
        'Banner', 
        `Salvo com Sucesso!`, 
        'success'
      );
  } catch (err) {
    console.error(err);
    mostrarNotificacao(
        'Banner', 
          err || 'Erro ao salvar banner', 
        'error'
      );
  }
});

async function excluirBanner(id) {
  if (!confirm('Tem certeza que deseja excluir este banner?')) return;
  
  try {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!res.ok) throw new Error('Erro ao excluir banner');
    
    await carregarBanners();

       mostrarNotificacao(
        'Banner', 
        `Excluído com Sucesso!`, 
        'success'
      );

  } catch (err) {
    console.error(err);    
    
   mostrarNotificacao(
        'Banner', 
          err || 'Erro ao excluir Banner.', 
        'error'
      );
  }
}

// =================== GESTÃO DE PEDIDOS ===================
let pedidosAgrupados = [];
let pedidosFiltrados = [];

// Carregar pedidos ao iniciar (adicione esta chamada no DOMContentLoaded se quiser)

async function carregarPedidosAdmin() {
  try {
    const res = await fetch('/api/pedidos', { headers: getHeaders() });
    
    // Lê a resposta como JSON
    const data = await res.json();
    //console.log('Resposta da API /api/pedidos:', data); // <-- Isso vai nos mostrar o que o servidor está enviando
    
    // Se a resposta não for OK (ex: 401, 500), lança o erro
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao carregar pedidos');
    }
    
    // Garante que estamos trabalhando com um array
    // (Aceita tanto o array direto quanto um objeto { pedidos: [...] })
    const pedidos = Array.isArray(data) ? data : (data.pedidos || []);
    
    if (!Array.isArray(pedidos)) {
      throw new Error('Formato de dados inesperado do servidor.');
    }
    
    // Agrupar por numos
    const agrupados = {};
    for (const p of pedidos) {
      if (!agrupados[p.numos]) {
        agrupados[p.numos] = {
          numos: p.numos,
          nomecliente: p.nomecliente,
          contatocliente: p.contatocliente,
          datapedido: p.datapedido,
          situacaopedido: p.situacaopedido,
          produtos: [],
          total: 0
        };
      }
      agrupados[p.numos].produtos.push(p);
      agrupados[p.numos].total += parseFloat(p.valor || 0);
    }
    
    pedidosAgrupados = Object.values(agrupados).sort((a, b) => b.numos - a.numos);
    pedidosFiltrados = [...pedidosAgrupados];
    renderizarPedidosAdmin();
    
  } catch (err) {
    console.error('Erro em carregarPedidosAdmin:', err);
    document.getElementById('listaPedidosAdmin').innerHTML = `
      <p style="color:red; text-align:center; padding: 20px;">
        Erro ao carregar pedidos: ${err.message}<br>
        <small>Verifique o console (F12) para mais detalhes.</small>
      </p>`;
  }
}

function renderizarPedidosAdmin() {
  const div = document.getElementById('listaPedidosAdmin');
  if (pedidosFiltrados.length === 0) {
    div.innerHTML = '<p style="text-align:center; color:#666;">Nenhum pedido encontrado.</p>';
    return;
  }

  const situacoes = {
    0: {texto: 'Pendente', cor: '#ffc107', textoCor: '#856404'},
    1: {texto: 'Em Produção', cor: '#17a2b8', textoCor: '#0c5460'},
    2: {texto: 'Pronto', cor: '#28a745', textoCor: '#155724'},
    3: {texto: 'Entregue', cor: '#007bff', textoCor: '#004085'},
    4: {texto: 'Cancelado', cor: '#dc3545', textoCor: '#721c24'}
  };

  div.innerHTML = pedidosFiltrados.map(p => {
    const sit = situacoes[p.situacaopedido] || situacoes[0];
    const data = new Date(p.datapedido).toLocaleString('pt-BR');
    
    return `
      <div class="item-admin" style="border-left: 4px solid ${sit.cor};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong style="font-size:1.1rem; color:var(--primary);">OS #${p.numos}</strong>
          <span style="background:${sit.cor}; color:${sit.textoCor}; padding:4px 10px; border-radius:15px; font-size:0.8rem; font-weight:bold;">
            ${sit.texto}
          </span>
        </div>
        <p><strong>👤 Cliente:</strong> ${p.nomecliente}</p>
        <p><strong>📱 Telefone:</strong> ${p.contatocliente}</p>
        <p><strong>📅 Data:</strong> ${data}</p>
        <p><strong>📦 Itens:</strong> ${p.produtos.length} produto(s) | <strong>Total:</strong> R$ ${p.total.toFixed(2).replace('.', ',')}</p>
        
        <div class="acoes" style="margin-top:15px; gap:10px;">
          <button class="btn-editar" onclick="verProdutosPedido(${p.numos})">👁️ Ver Produtos</button>
          <select onchange="alterarSituacaoPedido(${p.numos}, this.value)" style="padding:6px; border-radius:5px; border:1px solid #ccc; cursor:pointer;">
            <option value="0" ${p.situacaopedido == 0 ? 'selected' : ''}>Pendente</option>
            <option value="1" ${p.situacaopedido == 1 ? 'selected' : ''}>Em Produção</option>
            <option value="2" ${p.situacaopedido == 2 ? 'selected' : ''}>Pronto</option>
            <option value="3" ${p.situacaopedido == 3 ? 'selected' : ''}>Entregue</option>
            <option value="4" ${p.situacaopedido == 4 ? 'selected' : ''}>Cancelado</option>
          </select>
            <button class="btn-excluir" onclick="excluirPedido(${p.numos})" style="background:#dc3545;color:white;border:none;padding:8px 15px;border-radius:6px;cursor:pointer;font-size:0.9rem;">
              🗑️ Excluir
            </button>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarPedidosAdmin() {
  const busca = document.getElementById('searchPedido').value.toLowerCase();
  const situacao = document.getElementById('filterSituacaoPedido').value;
  
  pedidosFiltrados = pedidosAgrupados.filter(p => {
    const matchBusca = !busca || 
      p.numos.toString().includes(busca) ||
      p.nomecliente.toLowerCase().includes(busca) ||
      p.contatocliente.toLowerCase().includes(busca);
    const matchSituacao = !situacao || p.situacaopedido == parseInt(situacao);
    return matchBusca && matchSituacao;
  });
  renderizarPedidosAdmin();
}

async function excluirPedido(numos) {
  // Confirmação antes de excluir
   const confirmado = await mostrarConfirmacao(
    'Excluir Permanentemente?',
    `Você está prestes a excluir a <strong>OS #${numos}</strong>.<br><br>Esta ação NÃO pode ser desfeita e todos os itens deste pedido serão removidos do banco de dados.`
  );

  
  if (!confirmado) return;
  
  try {
    const res = await fetch(`/api/pedidos/${numos}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarNotificacao(
        'Pedido Excluído!', 
        `OS #${numos} foi excluída com sucesso.`, 
        'success'
      );
      
      // Recarregar a lista de pedidos
      await carregarPedidosAdmin();
    } else {
      mostrarNotificacao(
        'Erro', 
        data.error || 'Não foi possível excluir o pedido.', 
        'error'
      );
    }
  } catch (err) {
    console.error('Erro:', err);
    mostrarNotificacao(
      'Erro de Conexão', 
      'Não foi possível conectar ao servidor.', 
      'error'
    );
  }
}

async function verProdutosPedido(numos) {
  const pedido = pedidosAgrupados.find(p => p.numos == numos);
  if (!pedido) return;

  document.getElementById('modalTituloPedido').textContent = `Produtos da OS #${numos}`;
  document.getElementById('modalInfoCliente').innerHTML = `
    <p><strong>Cliente:</strong> ${pedido.nomecliente} | <strong>Telefone:</strong> ${pedido.contatocliente}</p>
    <p><strong>Data:</strong> ${new Date(pedido.datapedido).toLocaleString('pt-BR')}</p>
  `;
  
  // Placeholder SVG inline (não depende de internet)
  const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MCIgaGVpZ2h0PSI3MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPkltYWdlbTwvdGV4dD48L3N2Zz4=';
  
  let htmlProdutos = '';
  for (const prod of pedido.produtos) {
    // ✅ CORREÇÃO: Construir URL completa da imagem
    let imagemUrl = placeholder;
    
    // Primeiro tenta a imagem salva no pedido
    if (prod.imagem_produto) {
      // Se começa com /uploads/, adiciona o domínio
      imagemUrl = prod.imagem_produto.startsWith('http') 
        ? prod.imagem_produto 
        : `http://localhost:3000${prod.imagem_produto}`;
    }
    // Se não, tenta a imagem original do produto
    else if (prod.imagem_original) {
      imagemUrl = prod.imagem_original.startsWith('http')
        ? prod.imagem_original
        : `http://localhost:3000${prod.imagem_original}`;
    }
    
    htmlProdutos += `
      <div style="display:flex;align-items:center;gap:15px;padding:10px;border-bottom:1px solid #eee;">
        <img src="${imagemUrl}" 
             style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;"
             onclick="abrirZoom('${imagemUrl}')"
             onerror="this.onerror=null; this.src='${placeholder}'">
        <div style="flex:1;">
          <strong>${prod.nome_produto || 'Produto'}</strong>
          <p style="margin:0;color:#666;font-size:0.9rem;">Cód: ${prod.produto_id || 'N/A'}</p>
        </div>
        <strong style="color:var(--primary);">R$ ${parseFloat(prod.valor || 0).toFixed(2).replace('.', ',')}</strong>
        <i class="fas fa-search-plus" style="color:#8B4513;margin-left:10px;cursor:pointer;" onclick="abrirZoom('${imagemUrl}')"></i>
      </div>
    `;
  }
  
  document.getElementById('modalListaProdutos').innerHTML = htmlProdutos;
  document.getElementById('modalTotalPedido').textContent = `R$ ${pedido.total.toFixed(2).replace('.', ',')}`;
  document.getElementById('modalProdutosPedido').style.display = 'block';
}

function fecharModalPedido() {
  document.getElementById('modalProdutosPedido').style.display = 'none';
}

async function alterarSituacaoPedido(numos, novaSituacao) {
  try {
    const res = await fetch(`/api/pedidos/${numos}/situacao`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ situacaopedido: parseInt(novaSituacao) })
    });
    
    if (res.ok) {
     // alert('Situação atualizada com sucesso!');
      mostrarNotificacao('Gestão de Pedidos', 'Situação atualizada com sucesso!', 'success', 5000); 
      carregarPedidosAdmin(); // Recarrega a lista
    } else {
      mostrarNotificacao('Gestão de Pedidos', 'Erro de conexão ao atualizar', 'error', 5000); 
    }
  } catch (err) {
    mostrarNotificacao('Gestão de Pedidos', 'Erro de conexão ao atualizar', 'error', 5000); 
  }
}
// =================== SISTEMA DE NOTIFICAÇÕES ===================

function mostrarNotificacao(titulo, mensagem, tipo = 'info', duracao = 4000) {
  // Remover notificação existente
  const existente = document.querySelector('.notification');
  if (existente) {
    existente.remove();
  }

  // Ícones para cada tipo
  const icones = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: ''
  };

  // Títulos padrão
  const titulosPadrao = {
    success: 'Sucesso!',
    error: 'Erro!',
    warning: 'Atenção!',
    info: 'Informação'
  };

  // Criar elemento de notificação
  const notificacao = document.createElement('div');
  notificacao.className = `notification ${tipo}`;
  notificacao.innerHTML = `
    <div class="notification-icon">${icones[tipo] || icones.info}</div>
    <div class="notification-content">
      <div class="notification-title">${titulo || titulosPadrao[tipo]}</div>
      <div class="notification-message">${mensagem}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;

  // Adicionar ao body
  document.body.appendChild(notificacao);

  // Mostrar com animação
  setTimeout(() => notificacao.classList.add('show'), 10);

  // Auto-fechar após a duração especificada
  if (duracao > 0) {
    setTimeout(() => {
      notificacao.classList.add('hiding');
      setTimeout(() => notificacao.remove(), 400);
    }, duracao);
  }
}

function mostrarConfirmacao(titulo, mensagem) {
  return new Promise((resolve) => {
    // Criar o overlay do modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); z-index: 10000; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(3px);
      animation: fadeIn 0.2s ease-out;
    `;

    // Criar o conteúdo do modal
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; color: #3E2723; font-family: 'Georgia', serif; font-size: 1.4rem;">${titulo}</h3>
        <p style="color: #666; margin-bottom: 25px; line-height: 1.5;">${mensagem}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="btnCancelarConfirm" style="flex: 1; padding: 12px; border: 2px solid #e0e0e0; background: white; color: #666; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;">Cancelar</button>
          <button id="btnConfirmarExcluir" style="flex: 1; padding: 12px; border: none; background: linear-gradient(135deg, #dc3545, #c82333); color: white; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3);">Sim, Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Função para fechar e retornar o resultado
    const fechar = (resultado) => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s ease-out';
      setTimeout(() => {
        modal.remove();
        resolve(resultado);
      }, 200);
    };

    // Eventos de clique
    modal.querySelector('#btnConfirmarExcluir').onclick = () => fechar(true);
    modal.querySelector('#btnCancelarConfirm').onclick = () => fechar(false);
    
    // Fechar ao clicar fora do modal
    modal.onclick = (e) => {
      if (e.target === modal) fechar(false);
    };
  });
}

// =================== LOGOUT ===================
function logout() {
  fetch('/api/logout', { method: 'POST' });
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}