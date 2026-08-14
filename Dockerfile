# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite nhúng biến này vào bundle LÚC BUILD, sửa sau khi build không có tác dụng.
# Mặc định "/api" = gọi cùng origin, nginx proxy sang backend -> không cần biết
# domain hay cổng, và không dính CORS.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
