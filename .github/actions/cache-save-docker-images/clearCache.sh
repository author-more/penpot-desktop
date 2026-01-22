#!/bin/bash

# Check if the cache path argument is provided
if [ "$#" -ne 1 ]; then
    echo "Cache path is missing."
    echo "Usage: $0 <cache_path>"
    exit 1
fi

CACHE_PATH=$1

rm -rf $CACHE_PATH
