import sys, json, base64, urllib.request
from nacl import encoding
from nacl.public import PublicKey, SealedBox

token, mongo, gem, owner = sys.argv[1:5]
REPO = 'saqibiqbaltesting-ai/SAQI-MD'

def api(path, data=None, method='GET'):
    req = urllib.request.Request(f'https://api.github.com{path}',
        data=json.dumps(data).encode() if data else None, method=method,
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'saqi-md-setup'})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')

_, pk = api(f'/repos/{REPO}/actions/secrets/public-key')
print('public key:', pk['key_id'])
sealed = SealedBox(PublicKey(base64.b64decode(pk['key']), encoding.RawEncoder()))

def put_secret(name, value):
    enc = base64.b64encode(sealed.encrypt(value.encode('utf-8'))).decode()
    s, _ = api(f'/repos/{REPO}/actions/secrets/{name}', {'encrypted_value': enc, 'key_id': pk['key_id']}, 'PUT')
    print(f'{name}: HTTP {s}')

put_secret('MONGODB_URI', mongo)
put_secret('GEMINI_API_KEY', gem)
put_secret('OWNER_NUMBERS', owner)
