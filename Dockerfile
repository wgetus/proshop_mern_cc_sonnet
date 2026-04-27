FROM node:18-bullseye AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY . .
RUN npm run build --prefix frontend

FROM node:18-bullseye-slim

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend ./backend
COPY --from=build /app/uploads ./uploads
COPY --from=build /app/frontend/build ./frontend/build

EXPOSE 5000

CMD ["npm", "start"]
