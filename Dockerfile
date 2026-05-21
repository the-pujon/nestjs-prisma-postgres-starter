# FROM node:20-alpine

# WORKDIR /app

# # Copy package.json first for caching
# COPY package*.json ./

# # Copy prisma folder
# COPY prisma ./prisma/

# # Install dependencies
# RUN npm install

# # Copy the rest of your app
# COPY . .

# # Generate Prisma client
# RUN npx prisma generate

# # Build NestJS app
# RUN npm run build

# EXPOSE 5000

# # Start the app
# CMD ["node", "dist/main.js"]


# # FROM node:20-alpine

# # WORKDIR /app

# # COPY package*.json ./
# # COPY prisma ./prisma/

# # RUN npm install

# # COPY . .

# # # Generate Prisma client
# # RUN npx prisma generate

# # EXPOSE 3000

# # # Start Nest in dev mode
# # CMD ["npm", "run", "start:dev"]



# FROM node:20-alpine

# WORKDIR /app

# # Copy package.json and package-lock.json first for better caching
# COPY package*.json ./
# # Copy prisma folder
# COPY prisma ./prisma/

# # Install dependencies
# RUN npm install

# # Copy the rest of your app
# COPY . .


# # Generate Prisma client
# RUN npx prisma generate

# # Build NestJS app
# RUN npm run build

# EXPOSE 5000

# # Start the app in production mode
# CMD ["node", "dist/src/main.js"]

# ---------- Build Stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


# ---------- Runtime Stage ----------
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

EXPOSE 5000
CMD ["node", "dist/src/main.js"]
