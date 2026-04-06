FROM node:24-alpine

ARG env=production
ENV NODE_ENV=$env

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
