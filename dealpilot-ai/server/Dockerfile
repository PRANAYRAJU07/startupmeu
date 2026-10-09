FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci -w server --omit=dev
COPY server/src ./server/src
RUN chown -R node:node /app
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health/live || exit 1
CMD ["node", "server/src/server.js"]
