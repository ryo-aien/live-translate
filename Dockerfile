FROM node:22-slim AS base
WORKDIR /app

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev"]

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server

EXPOSE 8080
CMD ["npm", "run", "start"]
