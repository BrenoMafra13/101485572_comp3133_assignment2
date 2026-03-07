FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist/101485572_comp3133_assignment2 /app
EXPOSE 3000
CMD ["serve", "-s", "/app/browser", "-l", "3000"]
