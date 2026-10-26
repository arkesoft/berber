FROM node:24-bookworm-slim AS build
WORKDIR /opt/salon
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci
COPY app/contracts ./app/contracts
COPY backend ./backend
RUN cd backend && npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/salon/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /opt/salon/backend/dist ./dist
COPY backend/migrations ./migrations
USER node
EXPOSE 3001
CMD ["node", "--enable-source-maps", "dist/backend/src/server.js"]
