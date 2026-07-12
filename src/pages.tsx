// Server-rendered HTML pages returned as strings.

const HEAD = (title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%92%AC%3C/text%3E%3C/svg%3E">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); }
    .glass { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
    .fade-in { animation: fadeIn .4s ease; }
    @keyframes fadeIn { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
  </style>
</head>
`

export function renderPage(page: string, data: any): string {
  switch (page) {
    case 'auth': return authPage()
    case 'dashboard': return dashboardPage(data.user, data.tab)
    case 'send': return sendPage(data.target)
    case 'notfound': return notFoundPage(data.username)
    case 'admin': return adminPage()
    case 'oauth_error': return oauthErrorPage(data.message)
    default: return '<h1>Not found</h1>'
  }
}

// ---------------- AUTH PAGE ----------------
function authPage(): string {
  return `${HEAD('Whisper - Anonymous Messages')}
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
  <div class="glass rounded-3xl shadow-2xl w-full max-w-md p-8 fade-in">
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg text-white text-3xl mb-3 shadow-lg">
        <i class="fas fa-comment-dots"></i>
      </div>
      <h1 class="text-3xl font-bold text-gray-800">Whisper</h1>
      <p class="text-gray-500 mt-1">Send & receive anonymous messages</p>
    </div>

    <!-- Tabs -->
    <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
      <button id="tab-login" onclick="switchTab('login')" class="flex-1 py-2 rounded-lg font-semibold text-sm bg-white shadow text-purple-600">Log In</button>
      <button id="tab-signup" onclick="switchTab('signup')" class="flex-1 py-2 rounded-lg font-semibold text-sm text-gray-500">Sign Up</button>
    </div>

    <div id="error" class="hidden bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"></div>

    <!-- Login form -->
    <form id="login-form" onsubmit="return doLogin(event)" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Username or Email</label>
        <input name="identifier" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none" placeholder="yourname">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Password</label>
        <input name="password" type="password" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none" placeholder="••••••••">
      </div>
      <button type="submit" class="w-full gradient-bg text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition">Log In</button>
    </form>

    <!-- Signup form -->
    <form id="signup-form" onsubmit="return doSignup(event)" class="space-y-4 hidden">
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Username <span class="text-gray-400">(your link: /@username)</span></label>
        <input name="username" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none" placeholder="yourname">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Email <span class="text-gray-400">(optional)</span></label>
        <input name="email" type="email" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none" placeholder="you@example.com">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">Password</label>
        <input name="password" type="password" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none" placeholder="min 6 characters">
      </div>
      <button type="submit" class="w-full gradient-bg text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition">Create Account</button>
    </form>

    <!-- Divider -->
    <div class="flex items-center my-6">
      <div class="flex-1 border-t border-gray-200"></div>
      <span class="px-3 text-sm text-gray-400">or</span>
      <div class="flex-1 border-t border-gray-200"></div>
    </div>

    <!-- Facebook -->
    <a href="/auth/facebook" class="flex items-center justify-center gap-3 w-full bg-[#1877f2] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#166fe5] transition">
      <i class="fab fa-facebook-f text-lg"></i> Continue with Facebook
    </a>
  </div>

  <script>
    function switchTab(tab) {
      const login = document.getElementById('login-form');
      const signup = document.getElementById('signup-form');
      const tl = document.getElementById('tab-login');
      const ts = document.getElementById('tab-signup');
      document.getElementById('error').classList.add('hidden');
      if (tab === 'login') {
        login.classList.remove('hidden'); signup.classList.add('hidden');
        tl.classList.add('bg-white','shadow','text-purple-600'); tl.classList.remove('text-gray-500');
        ts.classList.remove('bg-white','shadow','text-purple-600'); ts.classList.add('text-gray-500');
      } else {
        signup.classList.remove('hidden'); login.classList.add('hidden');
        ts.classList.add('bg-white','shadow','text-purple-600'); ts.classList.remove('text-gray-500');
        tl.classList.remove('bg-white','shadow','text-purple-600'); tl.classList.add('text-gray-500');
      }
    }
    function showError(msg) {
      const e = document.getElementById('error');
      e.textContent = msg; e.classList.remove('hidden');
    }
    async function doLogin(e) {
      e.preventDefault();
      const f = e.target;
      const res = await fetch('/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ identifier: f.identifier.value, password: f.password.value })
      });
      const data = await res.json();
      if (data.success) location.href = '/play'; else showError(data.error);
      return false;
    }
    async function doSignup(e) {
      e.preventDefault();
      const f = e.target;
      const res = await fetch('/api/signup', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username: f.username.value, email: f.email.value, password: f.password.value })
      });
      const data = await res.json();
      if (data.success) location.href = '/play'; else showError(data.error);
      return false;
    }
  </script>
</body></html>`
}

// ---------------- DASHBOARD ----------------
function dashboardPage(user: any, tab: string): string {
  const avatar = user.avatar_url
    ? `<img src="${user.avatar_url}" class="w-full h-full object-cover rounded-full">`
    : `<span class="text-2xl font-bold text-white">${(user.display_name||user.username)[0].toUpperCase()}</span>`
  return `${HEAD('Whisper Dashboard')}
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-lg mx-auto min-h-screen bg-white shadow-xl flex flex-col">
    <!-- Header -->
    <header class="gradient-bg text-white p-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">${avatar}</div>
        <div>
          <p class="font-bold text-lg">${user.display_name || user.username}</p>
          <p class="text-sm text-white/80">@${user.username}</p>
        </div>
      </div>
      <a href="/logout" class="text-white/80 hover:text-white" title="Log out"><i class="fas fa-sign-out-alt text-xl"></i></a>
    </header>

    <!-- Tab nav -->
    <nav class="flex border-b border-gray-100">
      <a href="/play" class="flex-1 py-4 text-center font-semibold ${tab==='play'?'text-purple-600 border-b-2 border-purple-600':'text-gray-400'}">
        <i class="fas fa-play-circle mr-1"></i> Play
      </a>
      <a href="/inbox" class="flex-1 py-4 text-center font-semibold relative ${tab==='inbox'?'text-purple-600 border-b-2 border-purple-600':'text-gray-400'}">
        <i class="fas fa-inbox mr-1"></i> Inbox
        <span id="unread-badge" class="hidden absolute top-3 ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5"></span>
      </a>
    </nav>

    <main class="flex-1 p-6" id="content"></main>
  </div>

  <script>
    const USER = ${JSON.stringify({ username: user.username })};
    const TAB = '${tab}';

    async function loadPlay() {
      const me = await (await fetch('/api/me')).json();
      document.getElementById('content').innerHTML = \`
        <div class="text-center fade-in">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-bg text-white text-4xl mb-4 shadow-lg">
            <i class="fas fa-comment-dots"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Get anonymous messages!</h2>
          <p class="text-gray-500 mb-6">Share your link so friends can send you anonymous messages.</p>
          <div class="bg-gray-100 rounded-2xl p-4 mb-4">
            <p class="text-xs text-gray-400 mb-1">Your link</p>
            <p class="font-mono text-purple-600 font-semibold break-all" id="link-text">\${me.link}</p>
          </div>
          <button onclick="copyLink('\${me.link}')" id="copy-btn" class="w-full gradient-bg text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 transition mb-3">
            <i class="fas fa-copy mr-2"></i> Copy your link
          </button>
          <a href="\${me.link}" target="_blank" class="block w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition">
            <i class="fas fa-eye mr-2"></i> Preview my page
          </a>
          <div class="mt-6 flex justify-center gap-3">
            <button onclick="share('\${me.link}')" class="text-gray-500 hover:text-purple-600"><i class="fas fa-share-nodes text-2xl"></i></button>
          </div>
        </div>\`;
    }

    function copyLink(link) {
      navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('copy-btn');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        setTimeout(() => btn.innerHTML = orig, 1500);
      });
    }
    function share(link) {
      if (navigator.share) navigator.share({ title: 'Send me an anonymous message!', url: link });
      else copyLink(link);
    }

    async function loadInbox() {
      const c = document.getElementById('content');
      c.innerHTML = '<p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
      const data = await (await fetch('/api/messages')).json();
      if (!data.messages || data.messages.length === 0) {
        c.innerHTML = \`<div class="text-center py-16 fade-in">
          <i class="fas fa-inbox text-5xl text-gray-200 mb-4"></i>
          <p class="text-gray-500 font-semibold">No messages yet</p>
          <p class="text-gray-400 text-sm mt-1">Share your link from the Play tab to get anonymous messages!</p>
        </div>\`;
        return;
      }
      c.innerHTML = '<div class="space-y-3 fade-in">' + data.messages.map(m => \`
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-4 relative">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white flex-shrink-0">
              <i class="fas fa-user-secret"></i>
            </div>
            <div class="flex-1">
              <p class="text-gray-800 whitespace-pre-wrap break-words">\${escapeHtml(m.body)}</p>
              <p class="text-xs text-gray-400 mt-2">\${new Date(m.created_at + 'Z').toLocaleString()}</p>
            </div>
            <button onclick="delMsg(\${m.id}, this)" class="text-gray-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
          </div>
        </div>\`).join('') + '</div>';
    }
    function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
    async function delMsg(id, el) {
      await fetch('/api/messages/' + id, { method: 'DELETE' });
      el.closest('.bg-gradient-to-br').remove();
    }
    async function updateBadge() {
      const d = await (await fetch('/api/messages/unread')).json();
      const badge = document.getElementById('unread-badge');
      if (d.unread > 0) { badge.textContent = d.unread; badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }

    if (TAB === 'play') loadPlay(); else loadInbox();
    updateBadge();
  </script>
</body></html>`
}

// ---------------- SEND PAGE (public /@user) ----------------
function sendPage(target: any): string {
  const avatar = target.avatar_url
    ? `<img src="${target.avatar_url}" class="w-full h-full object-cover rounded-full">`
    : `<span class="text-4xl font-bold text-white">${(target.display_name||target.username)[0].toUpperCase()}</span>`
  return `${HEAD('Send @' + target.username + ' an anonymous message')}
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
  <div class="glass rounded-3xl shadow-2xl w-full max-w-md p-8 fade-in">
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-24 h-24 rounded-full gradient-bg overflow-hidden mb-3 shadow-lg">${avatar}</div>
      <h1 class="text-2xl font-bold text-gray-800">@${target.username}</h1>
      <p class="text-gray-500 mt-1">Send me an anonymous message!</p>
    </div>

    <div id="sent-view" class="hidden text-center py-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 text-3xl mb-4">
        <i class="fas fa-check"></i>
      </div>
      <h2 class="text-xl font-bold text-gray-800">Message sent!</h2>
      <p class="text-gray-500 mt-1 mb-6">Your message was sent anonymously. 🤫</p>
      <button onclick="reset()" class="w-full gradient-bg text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition">Send another</button>
      <a href="/" class="block mt-3 text-purple-600 font-semibold">Get your own link →</a>
    </div>

    <form id="send-form" onsubmit="return doSend(event)" class="space-y-4">
      <textarea name="body" required maxlength="1000" rows="4" placeholder="Send @${target.username} an anonymous message..." class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"></textarea>
      <div id="error" class="hidden bg-red-50 text-red-600 text-sm rounded-lg p-3"></div>
      <button type="submit" class="w-full gradient-bg text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition">
        <i class="fas fa-paper-plane mr-2"></i> Send!
      </button>
      <p class="text-center text-xs text-gray-400"><i class="fas fa-lock mr-1"></i> Anonymous &amp; secret. They won't know it's you.</p>
    </form>

    <div class="text-center mt-6 pt-6 border-t border-gray-100">
      <a href="/" class="text-purple-600 font-semibold text-sm">Get your own Whisper link →</a>
    </div>
  </div>

  <script>
    const USERNAME = '${target.username}';
    async function doSend(e) {
      e.preventDefault();
      const body = e.target.body.value;
      const res = await fetch('/api/send/' + USERNAME, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ body })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('send-form').classList.add('hidden');
        document.getElementById('sent-view').classList.remove('hidden');
      } else {
        const er = document.getElementById('error');
        er.textContent = data.error; er.classList.remove('hidden');
      }
      return false;
    }
    function reset() {
      document.getElementById('send-form').reset();
      document.getElementById('send-form').classList.remove('hidden');
      document.getElementById('sent-view').classList.add('hidden');
    }
  </script>
</body></html>`
}

// ---------------- NOT FOUND ----------------
function notFoundPage(username: string): string {
  return `${HEAD('User not found')}
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
  <div class="glass rounded-3xl shadow-2xl w-full max-w-md p-8 text-center fade-in">
    <i class="fas fa-user-slash text-5xl text-gray-300 mb-4"></i>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">@${escapeServer(username)} not found</h1>
    <p class="text-gray-500 mb-6">This user doesn't exist or the link is wrong.</p>
    <a href="/" class="inline-block gradient-bg text-white px-6 py-3 rounded-xl font-semibold shadow-lg">Get your own link</a>
  </div>
</body></html>`
}

// ---------------- OAUTH ERROR ----------------
function oauthErrorPage(message: string): string {
  return `${HEAD('Login error')}
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
  <div class="glass rounded-3xl shadow-2xl w-full max-w-md p-8 text-center fade-in">
    <i class="fas fa-triangle-exclamation text-5xl text-yellow-400 mb-4"></i>
    <h1 class="text-2xl font-bold text-gray-800 mb-2">Facebook login failed</h1>
    <p class="text-gray-500 mb-6">${escapeServer(message)}</p>
    <a href="/" class="inline-block gradient-bg text-white px-6 py-3 rounded-xl font-semibold shadow-lg">Back to login</a>
  </div>
</body></html>`
}

// ---------------- ADMIN PANEL ----------------
function adminPage(): string {
  return `${HEAD('Admin - Accounts')}
<body class="bg-gray-100 min-h-screen">
  <!-- Login gate -->
  <div id="login-gate" class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
      <div class="text-center mb-6">
        <i class="fas fa-user-shield text-4xl text-purple-600 mb-3"></i>
        <h1 class="text-2xl font-bold text-gray-800">Admin Panel</h1>
        <p class="text-gray-500 text-sm">Enter password to view accounts</p>
      </div>
      <div id="admin-error" class="hidden bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"></div>
      <form onsubmit="return adminLogin(event)" class="space-y-4">
        <input name="password" type="password" required placeholder="Admin password" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:outline-none">
        <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition">Enter</button>
      </form>
      <p class="text-xs text-gray-400 text-center mt-4">Default password: <code>admin123</code></p>
    </div>
  </div>

  <!-- Dashboard -->
  <div id="admin-dash" class="hidden max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800"><i class="fas fa-user-shield text-purple-600 mr-2"></i> Accounts</h1>
      <button onclick="loadAccounts()" class="bg-white border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"><i class="fas fa-rotate-right mr-1"></i> Refresh</button>
    </div>

    <div id="stats" class="grid grid-cols-3 gap-4 mb-6"></div>

    <div class="bg-white rounded-2xl shadow overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="p-4">ID</th>
            <th class="p-4">Username</th>
            <th class="p-4">Display / Email</th>
            <th class="p-4">Provider</th>
            <th class="p-4">Messages</th>
            <th class="p-4">Created</th>
            <th class="p-4">Last login</th>
          </tr>
        </thead>
        <tbody id="accounts-body"></tbody>
      </table>
    </div>
  </div>

  <script>
    async function adminLogin(e) {
      e.preventDefault();
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password: e.target.password.value })
      });
      const data = await res.json();
      if (data.success) { showDash(); }
      else { const er=document.getElementById('admin-error'); er.textContent=data.error; er.classList.remove('hidden'); }
      return false;
    }
    function showDash() {
      document.getElementById('login-gate').classList.add('hidden');
      document.getElementById('admin-dash').classList.remove('hidden');
      loadAccounts();
    }
    function escapeHtml(s){ if(s==null) return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
    async function loadAccounts() {
      const res = await fetch('/api/admin/accounts');
      if (res.status === 401) return;
      const data = await res.json();
      const s = data.stats;
      document.getElementById('stats').innerHTML = \`
        \${statCard('Total Users', s.total_users, 'fa-users', 'text-blue-500')}
        \${statCard('Total Messages', s.total_messages, 'fa-envelope', 'text-purple-500')}
        \${statCard('Facebook Users', s.fb_users, 'fa-facebook', 'text-[#1877f2]')}\`;
      document.getElementById('accounts-body').innerHTML = data.accounts.map(a => \`
        <tr class="border-t border-gray-50 hover:bg-gray-50">
          <td class="p-4 text-gray-400">\${a.id}</td>
          <td class="p-4"><a href="/@\${a.username}" target="_blank" class="font-semibold text-purple-600">@\${escapeHtml(a.username)}</a></td>
          <td class="p-4">
            <div class="font-medium text-gray-700">\${escapeHtml(a.display_name||'-')}</div>
            <div class="text-gray-400 text-xs">\${escapeHtml(a.email||'no email')}</div>
          </td>
          <td class="p-4">
            <span class="px-2 py-1 rounded-full text-xs font-semibold \${a.provider==='facebook'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600'}">
              \${a.provider==='facebook'?'<i class=\\'fab fa-facebook-f mr-1\\'></i>Facebook':'Local'}
            </span>
          </td>
          <td class="p-4"><span class="font-semibold">\${a.message_count}</span></td>
          <td class="p-4 text-gray-500 text-xs">\${new Date(a.created_at+'Z').toLocaleString()}</td>
          <td class="p-4 text-gray-500 text-xs">\${a.last_login? new Date(a.last_login+'Z').toLocaleString():'-'}</td>
        </tr>\`).join('');
    }
    function statCard(label, val, icon, color) {
      return \`<div class="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
        <div class="text-3xl \${color}"><i class="fas \${icon}"></i></div>
        <div><div class="text-2xl font-bold text-gray-800">\${val}</div><div class="text-gray-400 text-sm">\${label}</div></div>
      </div>\`;
    }
    // Try to auto-load if already authenticated
    fetch('/api/admin/accounts').then(r => { if (r.status !== 401) showDash(); });
  </script>
</body></html>`
}

function escapeServer(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
