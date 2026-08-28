#!/bin/bash

curl http://localhost:8000/v1/completions     -H "Content-Type: application/json"     -d '{
        "model": "Qwen/Qwen3-0.6B",
        "prompt": "San Francisco is a",
        "max_tokens": 70,
        "temperature": 0
    }'

