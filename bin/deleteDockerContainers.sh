#!/bin/sh

docker ps -a --format '{{.Names}}' | grep '^pd-' | xargs -r docker rm -f
docker network ls --format '{{.Name}}' | grep '^pd-' | xargs -r docker network rm
docker volume ls -q | grep '^pd-' | xargs -r docker volume rm
