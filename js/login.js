
const aviso = document.getElementById('loginAviso');
const telas = {
  login: { form: document.getElementById('loginForm'), titulo: 'Administração', descricao: 'Entre para editar os dados do dashboard.' },
  cadastro: { form: document.getElementById('cadastroForm'), titulo: 'Criar conta', descricao: 'Cadastre seu e-mail e uma senha para acessar a administração.' },
  recuperacao: { form: document.getElementById('recuperacaoForm'), titulo: 'Esqueceu sua senha?', descricao: 'Informe seu e-mail para receber o link de recuperação.' }
};

function mostrarAviso(msg, tipo='error') {
  aviso.textContent = msg;
  aviso.className = `standalone-notice show ${tipo}`;
}

function alternarTela(nome) {
  Object.entries(telas).forEach(([chave, tela]) => {
    tela.form.hidden = chave !== nome;
  });
  document.getElementById('authTitulo').textContent = telas[nome].titulo;
  document.getElementById('authDescricao').textContent = telas[nome].descricao;
  document.getElementById('authNav').hidden = nome !== 'login';
  document.getElementById('voltarLogin').hidden = nome === 'login';
  aviso.className = 'standalone-notice';
  aviso.textContent = '';
}

document.querySelectorAll('.standalone-password-toggle').forEach(botao => {
  botao.addEventListener('click', () => {
    const campo = document.getElementById(botao.dataset.target);
    const visivel = campo.type === 'password';
    campo.type = visivel ? 'text' : 'password';
    botao.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
    botao.setAttribute('title', visivel ? 'Ocultar senha' : 'Mostrar senha');
    botao.querySelector('svg').innerHTML = visivel
      ? '<path d="M3 3l18 18"/><path d="M10.58 10.59a2 2 0 0 0 2.83 2.83"/><path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61C3.63 8.45 2 12 2 12s3 7 10 7a9.73 9.73 0 0 0 5.39-1.61"/>'
      : '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
  });
});

document.getElementById('acaoCadastrar').addEventListener('click', () => alternarTela('cadastro'));
document.getElementById('acaoRecuperar').addEventListener('click', () => alternarTela('recuperacao'));
document.getElementById('voltarLogin').addEventListener('click', () => alternarTela('login'));

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) location.replace('admin.html');
})();

telas.login.form.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  btn.disabled = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('senha').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  if (error) return mostrarAviso('E-mail ou senha inválidos.');
  location.replace('admin.html');
});

telas.cadastro.form.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('cadastroEmail').value.trim();
  const password = document.getElementById('cadastroSenha').value;
  const confirmacao = document.getElementById('cadastroConfirmacao').value;
  if (password !== confirmacao) return mostrarAviso('As senhas não são iguais.');
  if (password.length < 8) return mostrarAviso('Use uma senha de pelo menos 8 caracteres.');

  const btn = e.currentTarget.querySelector('button[type="submit"]');
  btn.disabled = true;
  const redirect = new URL('login.html', location.href).href;
  const { data, error } = await supabaseClient.auth.signUp({
    email, password, options: { emailRedirectTo: redirect }
  });
  btn.disabled = false;

  if (error) return mostrarAviso('Não foi possível criar a conta: ' + error.message);
  if (data?.session) await supabaseClient.auth.signOut();
  mostrarAviso('Conta criada. Se o Supabase exigir confirmação, abra o link enviado ao seu e-mail antes de entrar.', 'success');
  e.currentTarget.reset();
});

telas.recuperacao.form.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('recuperacaoEmail').value.trim();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  btn.disabled = true;
  const redirectTo = new URL('admin.html', location.href).href;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  btn.disabled = false;
  if (error) return mostrarAviso('Não foi possível enviar o link: ' + error.message);
  mostrarAviso('Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.', 'success');
});

alternarTela('login');
