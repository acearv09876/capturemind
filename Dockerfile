FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN node setup.cjs

ENTRYPOINT ["node", "mcp-server.js"]
