# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/tmp/app

# Copy package.json and package-lock.json (if available) into the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application files into the working directory
COPY . .

# Expose the port 1337
EXPOSE 2000

# Run the application in development mode
CMD ["npm", "start"]