FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build giao diện Next.js
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]