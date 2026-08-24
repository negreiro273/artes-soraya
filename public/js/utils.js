/**
 * Aplica máscara de telefone brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param {string|HTMLElement} alvo - O seletor CSS (ex: '#meuTelefone') ou o elemento HTML
 */
function aplicarMascaraTelefone(alvo) {
  // Se for string, busca o elemento. Se já for elemento, usa ele.
  const input = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;
  
  if (!input) return; // Se não encontrar o elemento, não faz nada e não quebra o site

  input.addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    } else {
      // Limita a 11 dígitos (DDD + 9 dígitos)
      valor = valor.substring(0, 11);
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    e.target.value = valor;
  });
}

