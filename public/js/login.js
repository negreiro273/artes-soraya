document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;
  const erroDiv = document.getElementById('loginErro');
  
  erroDiv.textContent = '';
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      erroDiv.textContent = data.error || 'Erro ao fazer login.';
      return;
    }
    
    // Salvar token
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    
    // Redirecionar para admin
    window.location.href = '/admin.html';
  } catch (err) {
    erroDiv.textContent = 'Erro de conexão.';
  }
});