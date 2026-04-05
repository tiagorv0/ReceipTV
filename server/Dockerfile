FROM node:24-alpine

ARG env=production
ENV NODE_ENV=$env

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
