import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { hashPassword, verifyPassword, createToken, verifyToken } from './auth'
import { renderPage } from './pages'

type Bindings = {
  DB: D1Database
  SESSION_SECRET?: string
  FACEBOOK_APP_ID?: string
  FACEBOOK_APP_SECRET?: string
  FACEBOOK_REDIRECT_URI?: string
  ADMIN_PASSWORD?: string
}

type User = {
  id: number
  username: string
  email: string | null
  password_hash: string | null
  display_name: string | null
  avatar_url: string | null
  provider: string
  provider_id: string | null
  created_at: string
  last_login: string | null
}

const app = new Hono<{ Bindings: Bindings }>()

const SECRET = (c: any) => c.env.SESSION_SECRET || 'dev-secret-change-me-in-production-12345'

// ---------- Helpers ----------
function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}

async function getCurrentUser(c: any): Promise<User | null> {
  const token = getCookie(c, 'session')
  if (!token) return null
  const payload = await verifyToken(token, SECRET(c))
  if (!payload || !payload.uid) return null
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.uid).first()
  return user as User | null
}

async function setSession(c: any, userId: number) {
  const token = await createToken({ uid: userId, iat: Date.now() }, SECRET(c))
  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

async function usernameAvailable(c: any, username: string): Promise<boolean> {
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  return !existing
}

async function generateUniqueUsername(c: any, base: string): Promise<string> {
  let username = sanitizeUsername(base) || 'user'
  if (await usernameAvailable(c, username)) return username
  for (let i = 1; i < 1000; i++) {
    const candidate = `${username}${i}`
    if (await usernameAvailable(c, candidate)) return candidate
  }
  return `${username}${Date.now()}`
}

// =====================================================
//  PAGE ROUTES
// =====================================================

// Landing / login page
app.get('/', async (c) => {
  const user = await getCurrentUser(c)
  if (user) return c.redirect('/play')
  return c.html(renderPage('auth', {}))
})

// Dashboard - Play tab
app.get('/play', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.redirect('/')
  return c.html(renderPage('dashboard', { user, tab: 'play' }))
})

// Dashboard - Inbox tab
app.get('/inbox', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.redirect('/')
  return c.html(renderPage('dashboard', { user, tab: 'inbox' }))
})

app.get('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.redirect('/')
})

// Public anonymous message page: /@username
app.get('/:handle{@.+}', async (c) => {
  const username = c.req.param('handle').slice(1).toLowerCase()
  const target = await c.env.DB.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE username = ?')
    .bind(username).first()
  if (!target) {
    return c.html(renderPage('notfound', { username }), 404)
  }
  return c.html(renderPage('send', { target }))
})

// Admin backend panel
app.get('/admin', async (c) => {
  return c.html(renderPage('admin', {}))
})

// =====================================================
//  API ROUTES
// =====================================================

// --- Signup ---
app.post('/api/signup', async (c) => {
  try {
    const { username, email, password } = await c.req.json()
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400)
    }
    const clean = sanitizeUsername(username)
    if (clean.length < 3) {
      return c.json({ error: 'Username must be at least 3 characters (letters, numbers, underscore)' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }
    if (!(await usernameAvailable(c, clean))) {
      return c.json({ error: 'Username is already taken' }, 409)
    }
    if (email) {
      const emailExists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
      if (emailExists) return c.json({ error: 'Email is already registered' }, 409)
    }
    const hash = await hashPassword(password)
    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, display_name, provider, last_login)
       VALUES (?, ?, ?, ?, 'local', CURRENT_TIMESTAMP)`
    ).bind(clean, email || null, hash, clean).run()
    await setSession(c, result.meta.last_row_id as number)
    return c.json({ success: true, username: clean })
  } catch (e: any) {
    return c.json({ error: 'Signup failed: ' + e.message }, 500)
  }
})

// --- Login ---
app.post('/api/login', async (c) => {
  try {
    const { identifier, password } = await c.req.json()
    if (!identifier || !password) {
      return c.json({ error: 'Please enter your username/email and password' }, 400)
    }
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(identifier.toLowerCase(), identifier).first() as User | null
    if (!user || !user.password_hash) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) return c.json({ error: 'Invalid credentials' }, 401)
    await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()
    await setSession(c, user.id)
    return c.json({ success: true, username: user.username })
  } catch (e: any) {
    return c.json({ error: 'Login failed: ' + e.message }, 500)
  }
})

// --- Current user info ---
app.get('/api/me', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.json({ error: 'Not authenticated' }, 401)
  const url = new URL(c.req.url)
  return c.json({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    provider: user.provider,
    link: `${url.origin}/@${user.username}`,
  })
})

// --- Get inbox messages ---
app.get('/api/messages', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.json({ error: 'Not authenticated' }, 401)
  const { results } = await c.env.DB.prepare(
    'SELECT id, body, is_read, created_at FROM messages WHERE recipient_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all()
  // Mark all as read
  await c.env.DB.prepare('UPDATE messages SET is_read = 1 WHERE recipient_id = ?').bind(user.id).run()
  return c.json({ messages: results })
})

// --- Unread count ---
app.get('/api/messages/unread', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.json({ error: 'Not authenticated' }, 401)
  const row = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM messages WHERE recipient_id = ? AND is_read = 0'
  ).bind(user.id).first()
  return c.json({ unread: row?.cnt || 0 })
})

// --- Delete a message ---
app.delete('/api/messages/:id', async (c) => {
  const user = await getCurrentUser(c)
  if (!user) return c.json({ error: 'Not authenticated' }, 401)
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM messages WHERE id = ? AND recipient_id = ?').bind(id, user.id).run()
  return c.json({ success: true })
})

// --- Send anonymous message ---
app.post('/api/send/:username', async (c) => {
  try {
    const username = c.req.param('username').toLowerCase()
    const { body } = await c.req.json()
    if (!body || body.trim().length === 0) {
      return c.json({ error: 'Message cannot be empty' }, 400)
    }
    if (body.length > 1000) {
      return c.json({ error: 'Message too long (max 1000 characters)' }, 400)
    }
    const target = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (!target) return c.json({ error: 'User not found' }, 404)
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO messages (recipient_id, body, sender_ip) VALUES (?, ?, ?)'
    ).bind(target.id, body.trim(), ip).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: 'Failed to send: ' + e.message }, 500)
  }
})

// =====================================================
//  FACEBOOK OAUTH
// =====================================================

// Start OAuth flow
app.get('/auth/facebook', async (c) => {
  const appId = c.env.FACEBOOK_APP_ID
  const url = new URL(c.req.url)
  const redirectUri = c.env.FACEBOOK_REDIRECT_URI || `${url.origin}/auth/facebook/callback`

  // If Facebook credentials are NOT configured, use demo mode so button works for testing
  if (!appId || !c.env.FACEBOOK_APP_SECRET) {
    return c.redirect('/auth/facebook/demo')
  }

  const state = crypto.randomUUID()
  setCookie(c, 'fb_state', state, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 600 })
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}&scope=public_profile,email`
  return c.redirect(authUrl)
})

// OAuth callback
app.get('/auth/facebook/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = getCookie(c, 'fb_state')
  if (!code || !state || state !== savedState) {
    return c.html(renderPage('oauth_error', { message: 'Invalid OAuth state or missing code.' }), 400)
  }
  const url = new URL(c.req.url)
  const redirectUri = c.env.FACEBOOK_REDIRECT_URI || `${url.origin}/auth/facebook/callback`
  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${c.env.FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${c.env.FACEBOOK_APP_SECRET}&code=${code}`
    )
    const tokenData: any = await tokenRes.json()
    if (!tokenData.access_token) {
      return c.html(renderPage('oauth_error', { message: 'Failed to get access token.' }), 400)
    }
    // Get user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
    )
    const profile: any = await profileRes.json()
    const user = await upsertFacebookUser(c, profile)
    await setSession(c, user.id)
    return c.redirect('/play')
  } catch (e: any) {
    return c.html(renderPage('oauth_error', { message: 'OAuth error: ' + e.message }), 500)
  }
})

// Demo Facebook login (works without real credentials, for testing)
app.get('/auth/facebook/demo', async (c) => {
  const demoId = 'demo_' + crypto.randomUUID().slice(0, 8)
  const profile = {
    id: demoId,
    name: 'Facebook Demo User',
    email: `${demoId}@facebook-demo.local`,
    picture: { data: { url: `https://ui-avatars.com/api/?name=FB+User&background=1877f2&color=fff` } },
  }
  const user = await upsertFacebookUser(c, profile)
  await setSession(c, user.id)
  return c.redirect('/play')
})

async function upsertFacebookUser(c: any, profile: any): Promise<User> {
  // Check if facebook user already exists
  let user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE provider = 'facebook' AND provider_id = ?"
  ).bind(profile.id).first() as User | null

  if (user) {
    await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()
    return user
  }

  const base = (profile.name || 'fbuser').replace(/\s+/g, '').toLowerCase()
  const username = await generateUniqueUsername(c, base)
  const avatar = profile.picture?.data?.url || null

  const result = await c.env.DB.prepare(
    `INSERT INTO users (username, email, display_name, avatar_url, provider, provider_id, last_login)
     VALUES (?, ?, ?, ?, 'facebook', ?, CURRENT_TIMESTAMP)`
  ).bind(username, profile.email || null, profile.name || username, avatar, profile.id).run()

  return await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first() as User
}

// =====================================================
//  ADMIN API
// =====================================================

app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json()
  const adminPass = c.env.ADMIN_PASSWORD || 'admin123'
  if (password !== adminPass) {
    return c.json({ error: 'Wrong admin password' }, 401)
  }
  const token = await createToken({ admin: true, iat: Date.now() }, SECRET(c))
  setCookie(c, 'admin_session', token, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24,
  })
  return c.json({ success: true })
})

async function isAdmin(c: any): Promise<boolean> {
  const token = getCookie(c, 'admin_session')
  if (!token) return false
  const payload = await verifyToken(token, SECRET(c))
  return !!(payload && payload.admin)
}

app.get('/api/admin/accounts', async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.display_name, u.provider, u.created_at, u.last_login,
       (SELECT COUNT(*) FROM messages m WHERE m.recipient_id = u.id) as message_count
     FROM users u ORDER BY u.created_at DESC`
  ).all()
  const stats = await c.env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM messages) as total_messages,
            (SELECT COUNT(*) FROM users WHERE provider = 'facebook') as fb_users`
  ).first()
  return c.json({ accounts: results, stats })
})

app.get('/api/admin/messages/:userId', async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: 'Unauthorized' }, 401)
  const userId = c.req.param('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, body, created_at, is_read FROM messages WHERE recipient_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  return c.json({ messages: results })
})

export default app
