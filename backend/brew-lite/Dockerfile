# Sử dụng Node 22 làm hệ điều hành gốc
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

# Copy các file bảng định tuyến thư viện vào trước để cache
COPY package*.json ./
RUN npm ci

# Copy toàn bộ code và schema
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build code TypeScript sang JavaScript
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && npm run start:dev"]