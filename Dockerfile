ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine as builder
LABEL fly_launch_runtime="NodeJS"
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine as runner
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY ./build/ /app/build/
COPY package*.json ./
CMD [ "npm", "run", "start:prod" ]
EXPOSE 3000
