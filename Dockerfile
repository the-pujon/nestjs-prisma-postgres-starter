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



FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
# Copy prisma folder
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy the rest of your app
COPY . .


# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

EXPOSE 5000

# Start the app in production mode
CMD ["node", "dist/src/main.js"]