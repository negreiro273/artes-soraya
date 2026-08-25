// public/js/auth-frontend.js

// =================== GERENCIAMENTO DE SESSÃO NO FRONTEND ===================

/**
 * Limpa TODOS os dados de acesso do navegador
 */
function limparSessaoCompleta() {
  console.warn('🔒 Sessão expirada ou inválida. Limpando dados...');
  
  // Limpa dados de autenticação
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  
  // Limpa dados do site (se existirem)
  localStorage.removeItem('listaPresentes');
  localStorage.removeItem('clienteInfo');
  
  // Limpa variáveis globais (caso o script ainda esteja na memória)
  if (typeof window.clienteInfo !== 'undefined') window.clienteInfo = null;
  if (typeof window.listaPresentes !== 'undefined') window.listaPresentes = [];
}

/**
 * Redireciona forçadamente para a tela de login
 */
function redirecionarParaLogin() {
  limparSessaoCompleta();
  window.location.href = '/login.html'; // Ajuste o caminho se necessário
}

/**
 * Interceptor Global do Fetch: Vigia TODAS as requisições
 * Se o backend responder 401 ou 403, faz o logout automático.
 */
const fetchOriginal = window.fetch;
window.fetch = async function (...args) {
  const response = await fetchOriginal.apply(this, args);
  
  // 401 = Não autorizado (sem token) | 403 = Proibido (token expirado/inválido)
  if (response.status === 401 || response.status === 403) {
    redirecionarParaLogin();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  
  return response;
};

/**
 * Verifica a sessão assim que a página carrega
 * Faz uma requisição leve para /api/me para saber se o token ainda é válido
 */
async function verificarSessaoAoCarregar() {
  const token = localStorage.getItem('token');
  
  // Se nem tem token, manda pro login direto
  if (!token) {
    redirecionarParaLogin();
    return false;
  }

  try {
    const response = await fetch('/api/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Se a resposta não for OK (200), o middleware do backend já barrou
    if (!response.ok) {
      redirecionarParaLogin();
      return false;
    }

    console.log('✅ Sessão validada com sucesso no carregamento.');
    return true;
    
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    redirecionarParaLogin();
    return false;
  }
}