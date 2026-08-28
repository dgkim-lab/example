#!/bin/bash

vllm serve Qwen/Qwen3-0.6B \
  --gpu-memory-utilization 0.4 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3

