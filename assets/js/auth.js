(() => {
  const cfg = window.JUMBARA_SUPABASE_CONFIG;
  if (!cfg || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  window.jumbaraSupabase = client;
  const form = document.getElementById('authForm');
  const message = document.getElementById('authMessage');
  const submit = document.getElementById('authSubmit');
  const modeButton = document.getElementById('authModeToggle');
  let mode = 'login';
  const say = (text, error = false) => { if (message) { message.textContent = text; message.dataset.type = error ? 'error' : 'success'; } };
  const syncMode = () => {
    if (!form) return;
    const signup = mode === 'signup';
    document.getElementById('authTitle').textContent = signup ? 'Buat akun operator' : 'Masuk ke Jumbara PMR';
    document.getElementById('authSubtitle').textContent = signup ? 'Daftarkan akun. Hak akses akan diberikan oleh administrator.' : 'Gunakan email dan kata sandi akun Anda.';
    submit.textContent = signup ? 'Daftar akun' : 'Masuk';
    modeButton.textContent = signup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
    document.getElementById('fullNameField').hidden = !signup;
  };
  if (modeButton) modeButton.addEventListener('click', () => { mode = mode === 'login' ? 'signup' : 'login'; say(''); syncMode(); });
  if (form) {
    syncMode();
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true; say('Memproses...');
      const email = form.email.value.trim(); const password = form.password.value;
      try {
        if (mode === 'signup') {
          const fullName = form.fullName.value.trim();
          const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.href } });
          if (error) throw error;
          if (data.session) {
            const { error: profileError } = await client.from('profiles').upsert({ id: data.user.id, full_name: fullName });
            if (profileError) throw profileError;
            window.location.replace('index.html');
          } else say('Pendaftaran diterima. Periksa email untuk konfirmasi, lalu masuk kembali.');
        } else {
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const { error: profileError } = await client.from('profiles').upsert({ id: data.user.id, full_name: data.user.user_metadata?.full_name || null });
          if (profileError) throw profileError;
          window.location.replace('index.html');
        }
      } catch (error) { say(error.message || 'Terjadi kesalahan. Coba lagi.', true); }
      finally { submit.disabled = false; }
    });
    client.auth.getSession().then(({ data }) => { if (data.session) window.location.replace('index.html'); });
  } else {
    client.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.replace('login.html'); return; }
      const userLabel = document.getElementById('currentUser');
      if (userLabel) userLabel.textContent = data.session.user.email;
    });
    const logout = document.getElementById('logoutButton');
    if (logout) logout.addEventListener('click', async () => { await client.auth.signOut(); window.location.replace('login.html'); });
  }
})();