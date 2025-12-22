/**
 * CN Console login page logic
 */

export async function initCNLogin(root = document) {
  const page = root.querySelector('[data-cn-page="login"]');
  if (!page) return false;
  if (page.dataset.cnBound === '1') return true;
  page.dataset.cnBound = '1';

  const form = page.querySelector('#cnLoginForm');
  const emailEl = page.querySelector('#cnEmail');
  const passEl = page.querySelector('#cnPassword');
  const rememberEl = page.querySelector('#cnRemember');
  const btn = page.querySelector('#cnLoginBtn');
  const err = page.querySelector('#cnLoginError');

  const setError = (msg) => {
    if (!err) return;
    if (!msg) {
      err.style.display = 'none';
      err.textContent = '';
      return;
    }
    err.style.display = 'block';
    err.textContent = msg;
  };

  const setLoading = (loading) => {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? 'Signing in…' : 'Sign in';
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const email = String(emailEl?.value || '').trim();
    const password = String(passEl?.value || '');
    const remember = !!rememberEl?.checked;

    if (!email || !password) {
      setError('Enter email and password.');
      return;
    }

    setLoading(true);

    try {
      const { getAuthClient } = await import('/sundayapp/core/auth-client.js');
      const auth = getAuthClient();
      await auth.login(email, password, remember);

      // Ensure authentication state is set before redirect
      console.log('[CN Login] Login successful, auth state:', auth.isAuthenticated());

      // Small delay to ensure auth state is propagated
      setTimeout(() => {
        // redirect back to intended route
        const redirect = sessionStorage.getItem('sunday_redirect_after_login') || '#overview';
        sessionStorage.removeItem('sunday_redirect_after_login');
        console.log('[CN Login] Redirecting to:', redirect);
        window.location.hash = redirect;
      }, 100);
    } catch (e2) {
      setError(e2?.message || String(e2));
      setLoading(false);
    }
  });

  // Focus email
  try { emailEl?.focus(); } catch {}

  return true;
}
