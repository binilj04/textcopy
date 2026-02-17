# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build Go server
FROM golang:1.25-alpine AS go-build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o textcopy .

# Stage 3: Final minimal image
FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=go-build /app/textcopy .
COPY --from=frontend-build /app/frontend/out ./static

ENV PORT=8080
ENV STATIC_DIR=./static
EXPOSE 8080

CMD ["./textcopy"]
