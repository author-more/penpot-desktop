#!/bin/bash

# Check if the cache path argument is provided
if [ "$#" -ne 1 ]; then
    echo "Cache path is missing."
    echo "Usage: $0 <cache_path>"
    exit 1
fi

CACHE_PATH=$1
IMAGES=("penpotapp/frontend:latest" "penpotapp/exporter:latest" "penpotapp/backend:latest" "postgres:15" "sj26/mailcatcher:latest" "valkey/valkey:8.1")

for IMAGE in "${IMAGES[@]}"; do
		docker image load --input "${CACHE_PATH}/${IMAGE//[\/:]/-}.tar"
done
