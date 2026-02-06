############################
# 1. Frontend build
############################
FROM node:20-bookworm AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build


############################
# 2. Backend runtime
############################
FROM node:20-bookworm

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

# Fake env var for prisma to generate client - it will be overridden at runtime
ENV DATABASE_URL="file:./data/db.sqlite"
COPY backend/prisma ./prisma
RUN npx prisma generate

# frontend dist
COPY --from=frontend-build /frontend/dist ./public

# runtime data dir
RUN mkdir -p /app/data && chown node:node /app/data

EXPOSE 8080

COPY run.sh ./
RUN chmod +x run.sh
    
ENTRYPOINT ["./run.sh"]