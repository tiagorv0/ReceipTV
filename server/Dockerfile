FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
