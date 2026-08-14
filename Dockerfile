# Build + runtime do Dias Transporte para deploy próprio (VPS).
# O preset do nitro muda para node_server (no Lovable Cloud o alvo é Cloudflare).
FROM node:22-alpine AS build
WORKDIR /app

ENV NITRO_PRESET=node_server \
    VITE_AUTH_MODE=vps

COPY package.json package-lock.json* bun.lock* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/var/lib/dias-transporte/uploads

RUN mkdir -p /var/lib/dias-transporte/uploads && chown -R node:node /var/lib/dias-transporte

COPY --from=build /app/.output ./.output
COPY --from=build /app/db ./db
COPY --from=build /app/node_modules/postgres ./node_modules/postgres
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
