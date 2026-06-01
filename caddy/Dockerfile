# Caddy с встроенным DuckDNS DNS-плагином — нужен для DNS-01 ACME challenge.
# Обходит проблему «DuckDNS secondary nameservers сейчас SERVFAIL» — Caddy
# общается с DuckDNS API напрямую через токен, не ждёт публичный DNS lookup.
# caddy-dns/duckdns@v0.5.0 требует Go >= 1.24 — поэтому builder-alpine последний.
# Runtime image тоже последний alpine — для совместимости форматов конфигов.
FROM caddy:builder-alpine AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/duckdns

FROM caddy:alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
