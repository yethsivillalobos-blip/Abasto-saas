// Genera un par de llaves VAPID nuevas (usa esto si quieres tus propias llaves
// en vez de las de ejemplo en .env.example). No requiere dependencias externas.
const crypto = require('crypto');
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const pub = ecdh.getPublicKey();
let priv = ecdh.getPrivateKey();
if (priv.length < 32) {
  const padded = Buffer.alloc(32);
  priv.copy(padded, 32 - priv.length);
  priv = padded;
}
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + b64url(pub));
console.log('VAPID_PRIVATE_KEY=' + b64url(priv));
