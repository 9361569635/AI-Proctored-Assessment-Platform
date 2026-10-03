# Build context is the repo root. Build with:
#   docker build -f frontend/Dockerfile .

FROM node:20-slim AS build
WORKDIR /app
# See backend/Dockerfile's note on why this is `npm install` not `npm ci`.
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
