FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM golang:1.23-alpine AS go-builder

ARG TARGETPLATFORM=linux/amd64
ARG BUILDPLATFORM
ARG TARGETARCH=amd64
ARG TARGETOS=linux

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY crossview-go-server/go.mod crossview-go-server/go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod tidy && go mod download

COPY crossview-go-server/ ./

RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app/crossview-server ./main.go

FROM alpine:latest

ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

RUN apk add --no-cache --no-scripts ca-certificates tzdata || \
    (apk update && apk add --no-cache --no-scripts ca-certificates tzdata)

COPY --from=frontend-builder /app/dist ./dist
COPY --from=go-builder /app/crossview-server ./crossview-server
COPY --from=frontend-builder /app/config ./config

ENV PORT=3001

RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3001

CMD ["./crossview-server", "app:serve"]
