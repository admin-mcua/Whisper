// Auth utilities using Web Crypto (Cloudflare Workers compatible)

const encoder = new TextEncoder()

// ---------- Password hashing (PBKDF2) ----------
function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return arr
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return `${bufToHex(salt.buffer)}:${bufToHex(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = hexToBuf(saltHex)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return bufToHex(bits) === hashHex
}

// ---------- Session tokens (signed) ----------
function base64url(input: ArrayBuffer | string): string {
  let str: string
  if (typeof input === 'string') {
    str = btoa(input)
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(input)))
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  while (input.length % 4) input += '='
  return atob(input)
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createToken(payload: Record<string, any>, secret: string): Promise<string> {
  const data = base64url(JSON.stringify(payload))
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return `${data}.${base64url(sig)}`
}

export async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const [data, sigPart] = token.split('.')
    if (!data || !sigPart) return null
    const key = await getKey(secret)
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    if (base64url(expectedSig) !== sigPart) return null
    return JSON.parse(base64urlDecode(data))
  } catch {
    return null
  }
}
