FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Create data directories
RUN mkdir -p /app/data/blocks

# Expose ports
EXPOSE 3000 8080

# Set up environment
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Command to run the application
CMD ["npm", "start"] 