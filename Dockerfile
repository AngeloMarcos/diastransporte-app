# Build + runtime do car-fleet-co para deploy próprio (VPS).
# Mesmo formato do projeto irmão Dias Transporte. O preset do nitro muda para
# node_server (no Lovable Cloud o alvo é Cloudflare).
FROM node:22-alpine AS build
WORKDIR /app

ENV NITRO_PRESET=node_server \
    VITE_AUTH_MODE=vps

COPY package.json package-lock.json* bun.lock* ./
# --legacy-peer-deps: com o vitest 4 nas devDependencies, a resolução de peer
# deps padrão do npm 10 quebra com "Cannot read properties of null (reading
# 'edgesOut')" — bug do arborist, não do nosso package.json (reproduzido em
# instalação limpa, sem lockfile, fora do Docker). --legacy-peer-deps evita
# esse caminho de código.
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /app/.output ./.output
COPY --from=build /app/db ./db
COPY --from=build /app/node_modules/postgres ./node_modules/postgres
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
