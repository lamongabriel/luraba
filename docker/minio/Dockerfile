# MinIO no longer publishes pullable images, so the server is built from its source.
# Build args let you pin a release: --build-arg MINIO_VERSION=<go module version>.
FROM golang:1.24-alpine AS build
ARG MINIO_VERSION=latest
ENV CGO_ENABLED=0
RUN go install -trimpath -ldflags "-s -w" github.com/minio/minio@${MINIO_VERSION}

FROM alpine:3.21
COPY --from=build /go/bin/minio /usr/local/bin/minio
VOLUME /data
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
