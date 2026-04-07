FROM node:24-alpine AS builder

ARG env=production
ENV NODE_ENV=$env

WORKDIR /app
COPY package*.json ./
# Instala TODAS as dependências (incluindo devDeps necessárias para o build: typescript, etc.)
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
# Instala apenas dependências de produção na imagem final
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
