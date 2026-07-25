#!/usr/bin/env bash
#
# Generates a locally-trusted TLS certificate for the dev server.
#
# Why this exists: `beforeinstallprompt` (the in-app install button) only fires
# in a secure context, and a phone reaching the dev server over the LAN gets
# neither https nor localhost. A self-signed certificate does NOT fix this —
# Chrome treats an origin with a certificate error as insecure even after you
# click through the warning, and blocks service worker registration. The
# certificate has to chain to a CA the phone actually trusts.
#
# So: this creates a small private CA once, then issues a server certificate
# from it covering every address the app is reached at. Install the CA on the
# phone (see the printed instructions) and the LAN origin becomes secure.
#
#   ./scripts/dev-cert.sh [extra-ip-or-host ...]
#
# The CA is reused across runs — regenerating the leaf does not mean
# re-installing anything on the phone.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/certs"
CA_KEY="$OUT/rootCA-key.pem"
CA_CRT="$OUT/rootCA.crt"
KEY="$OUT/dev-key.pem"
CRT="$OUT/dev-cert.pem"

# Chrome and Safari cap server-certificate lifetime at 398 days. That limit is
# aimed at publicly-trusted CAs, but staying under it costs nothing and removes
# a whole class of "why is it untrusted" debugging.
LEAF_DAYS=397
CA_DAYS=3650

mkdir -p "$OUT"

hosts=(localhost)
ips=(127.0.0.1 ::1)

# This WSL/Linux box's own address.
for ip in $(hostname -I 2>/dev/null || true); do
  ips+=("$ip")
done

# Under WSL the phone talks to *Windows*, which port-proxies into WSL, so the
# certificate must carry the Windows LAN address — not this machine's.
if command -v powershell.exe >/dev/null 2>&1; then
  win_ips=$(powershell.exe -NoProfile -Command \
    "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -like '192.168.*' -or \$_.IPAddress -like '10.*' } | Select-Object -ExpandProperty IPAddress) -join ' '" \
    2>/dev/null | tr -d '\r' || true)
  for ip in $win_ips; do
    ips+=("$ip")
  done
fi

# Anything else the caller wants covered.
for arg in "$@"; do
  if [[ "$arg" =~ ^[0-9.]+$ || "$arg" =~ : ]]; then ips+=("$arg"); else hosts+=("$arg"); fi
done

# De-duplicate and build the SAN list. Chrome ignores the Common Name entirely —
# an address missing from here is an address the certificate does not cover.
san=""
for h in $(printf '%s\n' "${hosts[@]}" | sort -u); do san+="DNS:$h,"; done
for i in $(printf '%s\n' "${ips[@]}" | sort -u); do san+="IP:$i,"; done
san="${san%,}"

if [[ ! -f "$CA_KEY" || ! -f "$CA_CRT" ]]; then
  echo "→ Criando a CA local (uma vez só)…"
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
    -days "$CA_DAYS" \
    -keyout "$CA_KEY" -out "$CA_CRT" \
    -subj "/CN=MyOneGym Dev CA/O=MyOneGym Dev" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
else
  echo "→ Reaproveitando a CA existente em certs/rootCA.crt"
fi

echo "→ Emitindo o certificado do servidor para: $san"
openssl req -newkey rsa:2048 -nodes -keyout "$KEY" -out "$OUT/dev.csr" \
  -subj "/CN=MyOneGym Dev" 2>/dev/null

openssl x509 -req -in "$OUT/dev.csr" \
  -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$CRT" -days "$LEAF_DAYS" -sha256 \
  -extfile <(printf 'subjectAltName=%s\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n' "$san") \
  2>/dev/null

rm -f "$OUT/dev.csr"
chmod 600 "$KEY" "$CA_KEY"

cat <<EOF

✔ Pronto. O \`npm run dev\` passa a subir em https automaticamente
  (o vite.config.ts liga o https só quando estes arquivos existem).

Falta confiar na CA no celular — sem isso o Chrome continua tratando a
origem como insegura e o service worker não registra:

  1. Copie  certs/rootCA.crt  para o celular (e-mail, Google Drive, cabo…).
  2. Android: Configurações → Segurança → Mais configurações → Criptografia e
     credenciais → Instalar um certificado → Certificado CA → "Instalar mesmo
     assim" → escolha o arquivo.
     iOS: abra o arquivo → Configurações → Perfil Baixado → Instalar; depois
     Geral → Sobre → Confiança de Certificado → ative a CA.
  3. Abra https://<IP-do-Windows>:5173 no celular.

O Android vai mostrar um aviso permanente de "rede monitorada" enquanto a CA
estiver instalada. É esperado; remova a CA quando terminar o teste.
EOF
