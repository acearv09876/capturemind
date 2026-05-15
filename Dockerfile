FROM node:20-alpine

WORKDIR /app

# Add local node_modules/.bin to PATH so mcp-proxy can spawn tsx
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENTRYPOINT ["node", "mcp-server.js"]
