// =================== CONFIGURAÇÕES GLOBAIS ===================
let WHATSAPP_NUMERO = '';

// =================== VARIÁVEIS GLOBAIS ===================
let produtos = [];
let categorias = [];
let banners = [];
let pedidos = [];
let listaPresentes = JSON.parse(localStorage.getItem('listaPresentes') || '[]');
let clienteInfo = JSON.parse(localStorage.getItem('clienteInfo') || 'null');
let bannerAtual = 0;
let categoriaAtual = 'todas';
let produtoPendente = null;
let slideAtual = 0;
let imagemProdutoAtual = null;

// =================== INICIALIZAÇÃO ===================
document.addEventListener('DOMContentLoaded', () => {

  carregarCategorias();
  carregarProdutos();
  carregarBanners();
  
  setupBusca();
  aplicarMascaraTelefone(document.getElementById('clienteTelefone'));
  
 
  setupFormIdentificacao();

  atualizarBadgeLista();

 
});


// =================== MÁSCARA DE TELEFONE ===================
/*
function setupMascaraTelefone(telefone) {
  const input = telefone;

  console.log(telefone);

  if (input) {
    input.addEventListener('input', (e) => {
      let valor = e.target.value.replace(/\D/g, '');
      if (valor.length <= 11) {
        valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
        valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
      }
      e.target.value = valor;
    });
  }
}
*/

// =================== FORMULÁRIO DE IDENTIFICAÇÃO ===================
function setupFormIdentificacao() {
  const form = document.getElementById('formIdentificacao');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nome = document.getElementById('clienteNome').value.trim();
      const telefone = document.getElementById('clienteTelefone').value.trim();
      
  
      
      // Salvar informações do cliente
      clienteInfo = { nome, telefone };
      localStorage.setItem('clienteInfo', JSON.stringify(clienteInfo));
      
      // Fechar modal
      fecharModalIdentificacao();
      
      // Adicionar produto pendente se existir
      if (produtoPendente) {
        if (!listaPresentes.includes(produtoPendente)) {
          listaPresentes.push(produtoPendente);
          localStorage.setItem('listaPresentes', JSON.stringify(listaPresentes));
          //alert(`✅ Produto adicionado à lista de ${clienteInfo.nome}!`);
          mostrarNotificacao('Lista de Presentes', `Produto adicionado à lista de ${clienteInfo.nome}!`, 'warning');

        } else {
          //alert('⚠️ Produto já está na sua lista.');
          mostrarNotificacao('Lista de Presentes', 'Produto já está na sua lista.', 'warning');
        }
        produtoPendente = null;
      }
    });
  }
}

// =================== CATEGORIAS ===================
async function carregarCategorias() {
 

  try {
    const res = await fetch('/api/categorias');
    if (!res.ok) throw new Error('Erro ao carregar categorias');
    categorias = await res.json();
    
    const menu = document.getElementById('menuCategorias');
    if (menu) {
      menu.innerHTML = categorias.map(c =>
        `<button class="menu-btn" data-categoria="${c.id}" onclick="filtrarCategoria(${c.id})">
          <i class="fas ${c.icone || 'fa-box'}"></i> ${c.descricao}
        </button>`
      ).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

function filtrarCategoria(id) {

  

  categoriaAtual = id;
  
  // Atualizar botão ativo
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
  
  const btnAtivo = document.querySelector(`[data-categoria="${id}"]`);
  if (btnAtivo) btnAtivo.classList.add('active');
  
  carregarProdutos();
}

// =================== PRODUTOS ===================
async function carregarProdutos() {
  try {

    
    const busca = document.getElementById('searchInput').value;
    let url = '/api/produtos?';
    if (categoriaAtual !== 'todas') url += `categoria=${categoriaAtual}&`;
    if (busca) url += `busca=${encodeURIComponent(busca)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar produtos');
    produtos = await res.json();
    renderizarProdutos();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

function renderizarProdutos() {

  const grid = document.getElementById('produtosGrid');
  
  if (!grid) return;
  
  if (produtos.length === 0) {
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:#666;padding:40px;">Nenhum produto encontrado.</p>';
    return;
  }
  
  

  grid.innerHTML = produtos.map(p => `
    <div class="produto-card">
      <img src="${p.imagem || 'https://via.placeholder.com/300?text=Sem+Imagem'}" 
           alt="${p.nome}" 
           onerror="this.src='https://via.placeholder.com/300?text=Imagem+não+encontrada'">
      <div class="produto-info">
        <h3>${p.nome}</h3>
        <p class="categoria"><i class="fas fa-tag"></i> ${p.categoria_nome || 'Sem categoria'}</p>
        <p class="descricao">${p.descricao.substring(0, 80)}${p.descricao.length > 80 ? '...' : ''}</p>
        <p class="valor">R$ ${parseFloat(p.valor).toFixed(2).replace('.', ',')}</p>
        <button class="btn-detalhes" onclick="verDetalhes(${p.id})">
          <i class="fas fa-eye"></i> Ver Detalhes
        </button>
      </div>
    </div>
  `).join('');
}

function setupBusca() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', carregarProdutos);
  }
}

// =================== DETALHES DO PRODUTO COM CARROSSEL ===================

async function verDetalhes(id) {
  try {
    const res = await fetch(`/api/produtos/${id}`);
    if (!res.ok) throw new Error('Erro ao carregar produto');
    const p = await res.json();
    
    // Coletar todas as imagens disponíveis
    const imagens = [p.imagem, p.imagem2, p.imagem3].filter(img => img && img !== '');
    
    // Salvar imagem principal para usar no pedido
    imagemProdutoAtual = p.imagem || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgMzAwIDIyMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNOTAgMTEwIEwxMzUgNjUgTDE2NSA5NSBMMjEwIDY1IiBzdHJva2U9IiNiYmIiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iOTAiIHI9IjEyIiBmaWxsPSIjYmJiIi8+PHRleHQgeD0iNTAlIiB5PSI4NSUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSI+U2VtIEltYWdlbTwvdGV4dD48L3N2Zz4=';
    
    let imagensHTML = '';

    if (imagens.length > 1) {
        imagensHTML = `
          <div class="carrossel-polaroid">
            <button class="carrossel-btn prev" onclick="mudarSlide(-1)">❮</button>
            <div class="carrossel-container">
              ${imagens.map((img, i) => `
                <div class="polaroid-slide ${i === 0 ? 'active' : ''}" data-imagem="${img}">
                  <div class="polaroid-frame">
                    <img src="${img}" alt="${p.nome} - Foto ${i + 1}" 
                        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgMzAwIDIyMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='">
                    <div class="polaroid-caption">${p.nome}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="carrossel-btn next" onclick="mudarSlide(1)">❯</button>
            <div class="carrossel-dots">
              ${imagens.map((_, i) => `
                <span class="dot-carrossel ${i === 0 ? 'active' : ''}" onclick="irParaSlide(${i})"></span>
              `).join('')}
            </div>
          </div>
        `;
      } else {
         imagensHTML = `
          <div class="carrossel-polaroid">
            
            <div class="carrossel-container">
              ${imagens.map((img, i) => `
                <div class="polaroid-slide ${i === 0 ? 'active' : ''}" data-imagem="${img}">
                  <div class="polaroid-frame">
                    <img src="${img}" alt="${p.nome} - Foto ${i + 1}" 
                        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgMzAwIDIyMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='">
                    <div class="polaroid-caption">${p.nome}</div>
                  </div>
                </div>
              `).join('')}
            </div>
     
          </div>
        `;
        /*imagensHTML = `<img src="${p.imagem}" class="imagem-unica" alt="${p.nome}" 
                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgMzAwIDIyMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='">`;
        imagemProdutoAtual = p.imagem;*/
      }
    
    document.getElementById('modalBody').innerHTML = `
      ${imagensHTML}
      <h2>${p.nome}</h2>
      <p><strong>Categoria:</strong> ${p.categoria_nome || '-'}</p>
      <p style="margin:15px 0;">${p.descricao}</p>
      <h3 style="color:var(--accent);">R$ ${parseFloat(p.valor).toFixed(2).replace('.', ',')}</h3>
      <button class="btn-lista" style="margin-top:15px;width:100%;" onclick="adicionarLista(${p.id}, '${p.nome.replace(/'/g, "\\'")}', ${p.valor})">
        <i class="fas fa-plus"></i> Adicionar à Lista de Presentes
      </button>
      <a href="https://wa.me/${WHATSAPP_NUMERO}?text=Olá! Tenho interesse no produto: ${encodeURIComponent(p.nome)}"
         target="_blank" class="btn-whatsapp" style="display:block;text-align:center;text-decoration:none;margin-top:10px;">
        <i class="fab fa-whatsapp"></i> Consultar pelo WhatsApp
      </a>
    `;
    
      

    document.getElementById('modalDetalhes').style.display = 'block';
    slideAtual = 0;
  } catch (err) {
    console.error('Erro ao carregar detalhes:', err);
    mostrarNotificacao('Erro', 'Não foi possível carregar os detalhes do produto.', 'error');
  }
}



function fecharModal() {
  document.getElementById('modalDetalhes').style.display = 'none';
}

// =================== CARROSSEL ===================
/*
function mudarSlide(direcao) {
  const slides = document.querySelectorAll('.polaroid-slide');
  if (slides.length === 0) return;
  
  slides[slideAtual].classList.remove('active');
  slideAtual = (slideAtual + direcao + slides.length) % slides.length;
  slides[slideAtual].classList.add('active');
  
  atualizarDots();
}

function irParaSlide(index) {
  const slides = document.querySelectorAll('.polaroid-slide');
  if (slides.length === 0) return;
  
  slides[slideAtual].classList.remove('active');
  slideAtual = index;
  slides[slideAtual].classList.add('active');
  
  atualizarDots();
}
*/
function mudarSlide(direcao) {
  const slides = document.querySelectorAll('.polaroid-slide');
  if (slides.length === 0) return;
  
  slides[slideAtual].classList.remove('active');
  slideAtual = (slideAtual + direcao + slides.length) % slides.length;
  slides[slideAtual].classList.add('active');
  
  // ✅ ATUALIZAR A IMAGEM ATUAL
  imagemProdutoAtual = slides[slideAtual].dataset.imagem;
  
  atualizarDots();
}

function irParaSlide(index) {
  const slides = document.querySelectorAll('.polaroid-slide');
  if (slides.length === 0) return;
  
  slides[slideAtual].classList.remove('active');
  slideAtual = index;
  slides[slideAtual].classList.add('active');
  
  // ✅ ATUALIZAR A IMAGEM ATUAL
  imagemProdutoAtual = slides[slideAtual].dataset.imagem;
  
  atualizarDots();
}

function atualizarDots() {
  const dots = document.querySelectorAll('.dot-carrossel');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === slideAtual);
  });
}

// =================== IDENTIFICAÇÃO DO CLIENTE ===================
function verificarCliente(produtoId) {
  if (!clienteInfo) {
    produtoPendente = produtoId;
    document.getElementById('modalIdentificacao').style.display = 'block';
    return false;
  }
  return true;
}


async function adicionarLista(id, nome, valor) {
  if (!verificarCliente(id)) {
    return;
  }
  
  // ✅ Verificar se já existe pelo id do objeto
  const itemExistente = listaPresentes.find(item => item.id === id);
  
  if (!itemExistente) {
    listaPresentes.push({
      id: id,
      nome: nome,
      valor: parseFloat(valor),
      imagem: imagemProdutoAtual
    });
    localStorage.setItem('listaPresentes', JSON.stringify(listaPresentes));
    atualizarBadgeLista();
    mostrarNotificacao('Sucesso!', `Produto adicionado à lista de ${clienteInfo.nome}!`, 'success');
  } else {
    mostrarNotificacao('Atenção', 'Produto já está na sua lista.', 'warning');
  }
}

function finalizarPeido(){

    


}

function fecharModalIdentificacao() {
  document.getElementById('modalIdentificacao').style.display = 'none';
  produtoPendente = null;
}

// =================== LISTA DE PRESENTES ===================
function abrirLista() {
  renderizarLista();
  document.getElementById('modalLista').style.display = 'block';
}

function fecharLista() {
  document.getElementById('modalLista').style.display = 'none';
}



// Renderizar lista de presentes
async function renderizarLista() {
  const div = document.getElementById('listaItens');
  if (!div) return;
  
  let html = '';
  
  // Informações do cliente
  if (clienteInfo) {
    html += `
      <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--primary);">
        <p><strong>👤 Cliente:</strong> ${clienteInfo.nome}</p>
        <p><strong>📱 Telefone:</strong> ${clienteInfo.telefone}</p>

      </div>
    `;
  }
  
  // Produtos da lista
  if (listaPresentes.length === 0) {
    html += '<p style="text-align:center;color:#666;padding:20px;">Sua lista está vazia.</p>';
  } else {
    for (const item of listaPresentes) {
      html += `
        <div style="display:flex;align-items:center;gap:15px;padding:10px;border-bottom:1px solid #eee;">
          <img src="${item.imagem || 'https://via.placeholder.com/60'}" 
               style="width:60px;height:60px;object-fit:cover;border-radius:8px;"
               onerror="this.src='https://via.placeholder.com/60?text=Sem+Imagem'">
          <div style="flex:1;">
            <strong>${item.nome}</strong>
            <div style="color:var(--primary);font-weight:bold;">R$ ${item.valor.toFixed(2).replace('.', ',')}</div>
          </div>
            <button class="btn-remover-produto" onclick="removerLista(${item.id})" title="Remover produto">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
    }
    
  }
html += `
  <div style="display: flex; gap: 10px; margin-top: 15px;">
  <button onclick="finalizarPedido()" style="
      flex: 1;
      background: linear-gradient(135deg, #8B4513, #A0522D);
      color: white;
      border: none;
      padding: 15px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 10px rgba(139, 69, 19, 0.3);
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(139, 69, 19, 0.4)'
    " onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(139, 69, 19, 0.3)'">
      <i class="fas fa-check-circle"></i> Finalizar Pedido
    </button>

    <button onclick="fecharLista()" style="
      flex: 1;
      background: #6c757d;
      color: white;
      border: none;
      padding: 15px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
    " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
      <i class="fas fa-times-circle"></i> Fechar
    </button>
    
    
  </div>
`;
 
  
  div.innerHTML = html;
}


// Alterar dados do cliente
function alterarCliente() {
  localStorage.removeItem('clienteInfo');
  clienteInfo = null;
  fecharLista();
  document.getElementById('clienteNome').value = '';
  document.getElementById('clienteTelefone').value = '';
  alert('Dados removidos. Na próxima vez que adicionar um produto, será solicitado seu nome e telefone.');
}

function removerLista(id) {
  
  listaPresentes     = listaPresentes.filter(item => item.id !== id);
  localStorage.setItem('listaPresentes', JSON.stringify(listaPresentes));
  atualizarBadgeLista();
  renderizarLista();
  mostrarNotificacao('Produto removido', 'Produto removido da sua lista de presentes.', 'info', 2500);
}


function alterarCliente() {
  localStorage.removeItem('clienteInfo');
  clienteInfo = null;
  fecharLista();
  
  const inputNome = document.getElementById('clienteNome');
  const inputTelefone = document.getElementById('clienteTelefone');
  if (inputNome) inputNome.value = '';
  if (inputTelefone) inputTelefone.value = '';
  
  //alert('Dados removidos. Na próxima vez que adicionar um produto, será solicitado seu nome e telefone.');
   mostrarNotificacao('Dados removidos', 'Na próxima vez que adicionar um produto, será solicitado seu nome e telefone.', 'warning');
   
}

// =================== FINALIZAR PEDIDO ===================

async function finalizarPedido() {
  if (listaPresentes.length === 0) {
    mostrarNotificacao('Lista vazia', 'Adicione produtos antes de enviar.', 'warning');
    return;
  }
  
  if (!clienteInfo) {
    mostrarNotificacao('Identificação necessária', 'Por favor, identifique-se antes de enviar a lista.', 'warning');
    return;
  }
  
  try {
    // Montar lista de produtos com imagens
    let detalhesProdutos = [];
    let total = 0;
    
    for (const item of listaPresentes) {
      const res = await fetch(`/api/produtos/${item.id}`);
      const p = await res.json();
      const valor = parseFloat(p.valor);
      total += valor;
      
      detalhesProdutos.push({
        id: p.id,
        nome: p.nome,
        valor: valor,
        imagem: item.imagem || p.imagem // Usa imagem salva ou do banco
      });
    }
    
    // ENVIAR PARA O BACKEND
    const resPedido = await fetch('/api/pedidos/finalizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomecliente: clienteInfo.nome,
        contatocliente: clienteInfo.telefone,
        produtos: detalhesProdutos
      })
    });
    
    const dadosPedido = await resPedido.json();
    
    if (!resPedido.ok) {
      throw new Error(dadosPedido.error || 'Erro ao finalizar pedido');
    }
    
    const numerosOS = dadosPedido.pedidos.map(p => p.numos).join(', ');
    
    // Montar mensagem WhatsApp
    let msg = `🎁 *PEDIDO FINALIZADO - Artes da Soraya*%0A%0A`;
    msg += `📋 *OS Nº(s):* ${numerosOS}%0A%0A`;
    msg += `👤 *Cliente:* ${encodeURIComponent(clienteInfo.nome)}%0A`;
    msg += `📱 *Telefone:* ${encodeURIComponent(clienteInfo.telefone)}%0A%0A`;
    msg += `*Produtos:*%0A`;
    
    for (const produto of detalhesProdutos) {
      msg += `• ${encodeURIComponent(produto.nome)} - R$ ${produto.valor.toFixed(2).replace('.', ',')}%0A`;
    }
    
    msg += `%0A💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*%0A%0A`;
    msg += `✅ *Pedido registrado no sistema!*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`, '_blank');

      listaPresentes = [];
      localStorage.removeItem('listaPresentes');
      clienteInfo = null;
      localStorage.removeItem('clienteInfo');

      atualizarBadgeLista();  

      const inputNome = document.getElementById('clienteNome');
      const inputTelefone = document.getElementById('clienteTelefone');
      if (inputNome) inputNome.value = '';
      if (inputTelefone) inputTelefone.value = '';

     fecharLista();          

     mostrarNotificacao('Pedido Finalizado!', `OS Nº ${numerosOS} gerada(s) com sucesso! \n\n Obrigado pela preferência!\n\nSeu pedido foi registrado!`, 'success', 5000); 

      
  
    
  } catch (err) {
    console.error('Erro:', err);
    mostrarNotificacao('Erro', 'Não foi possível finalizar o pedido. Tente novamente.', 'error');
  }
}


// =================== BANNERS ===================
async function carregarBanners() {

 
   

  try {
    const res = await fetch('/api/banners');
    if (!res.ok) throw new Error('Erro ao carregar banners');
    
    const dadosRecebidos = await res.json();
    

    if (dadosRecebidos.length > 0 && dadosRecebidos[0].contato) {
      // Pega o número e remove TUDO que não for dígito (espaços, traços, etc)
      
      
      document.getElementById('idTelefone').innerHTML =dadosRecebidos[0].contato;
      
      let numeroLimpo = String(dadosRecebidos[0].contato).replace(/\D/g, '');
      
      // Segurança: Se o número tiver 10 ou 11 dígitos (DDD + Número), adiciona o DDI do Brasil (55)
      if (numeroLimpo.length === 10 || numeroLimpo.length === 11) {
        numeroLimpo = '55' + numeroLimpo;
      }     


      WHATSAPP_NUMERO = numeroLimpo;
      //console.log("✅ WhatsApp atualizado do banco:", WHATSAPP_NUMERO);
      



    } else {
      console.warn("⚠️ Contato não encontrado nos banners. Mantendo número padrão.");
      // Garante que a variável não fique vazia
      WHATSAPP_NUMERO = WHATSAPP_NUMERO || "5511999999999"; 
    }

    // Atualiza o botão flutuante se ele existir nesta página
    const btnWhatsApp = document.getElementById('btnWhatsApp');
    if (btnWhatsApp && WHATSAPP_NUMERO) {
      const mensagem = encodeURIComponent("Olá! Gostaria de mais informações sobre os produtos.");
      
      
      btnWhatsApp.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensagem}`;
      console.log("✅ Link do WhatsApp gerado:", btnWhatsApp.href);
    }


    const slider = document.getElementById('bannerSlider');
    const dots = document.getElementById('bannerDots');
    

    if (!slider || !dots) {
      console.log("ℹ️ Slider não encontrado nesta página. Renderização do banner pulada.");
      return; 
    }
    
    if (dadosRecebidos.length === 0) {
      slider.innerHTML = '<img src="https://via.placeholder.com/1200x400?text=Artes+da+Soraya" alt="Banner">';
      return;
    }

   
    banners = dadosRecebidos;
    
    slider.innerHTML = banners.map(b => 
      `<img src="${b.imagem}" alt="${b.titulo || 'Banner'}" 
            onerror="this.src='https://via.placeholder.com/1200x400?text=Imagem+não+encontrada'">`
    ).join('');
    
    dots.innerHTML = banners.map((_, i) =>
      `<span class="dot ${i === 0 ? 'active' : ''}" onclick="irBanner(${i})"></span>`
    ).join('');
  
    if (banners.length > 1) {
     
      if (window.intervaloBanner) clearInterval(window.intervaloBanner);
      window.intervaloBanner = setInterval(proximoBanner, 5000);
    }
    
  } catch (err) {
    console.error('Erro ao carregar banners:', err);
  }
}


function proximoBanner() {
  bannerAtual = (bannerAtual + 1) % banners.length;
  atualizarBanner();
}

function irBanner(i) {
  bannerAtual = i;
  atualizarBanner();
}

function atualizarBanner() {
  const slider = document.getElementById('bannerSlider');
  if (slider) {
    slider.style.transform = `translateX(-${bannerAtual * 100}%)`;
  }
  
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === bannerAtual);
  });
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

// =================== ATUALIZAR BADGE DA LISTA ===================
function atualizarBadgeLista() {
  const badge = document.getElementById('badgeListaPresentes');
  if (badge) {
    const quantidade = listaPresentes.length;
    if (quantidade > 0) {
      // Se tiver mais de 9 itens, mostra "9+" para não quebrar o layout
      badge.textContent = quantidade > 9 ? '9+' : quantidade;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// =================== FECHAR MODAIS AO CLICAR FORA ===================
window.onclick = (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
    produtoPendente = null;
  }
};