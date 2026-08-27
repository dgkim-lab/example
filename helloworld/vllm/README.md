# vllm

## Installation

- nvidia, https://docs.vllm.ai/en/latest/getting_started/quickstart/
```shell
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --torch-backend=auto
```

- for CPU, https://docs.vllm.ai/en/latest/getting_started/installation/cpu/
```shell
export VLLM_VERSION=$(curl -s https://api.github.com/repos/vllm-project/vllm/releases/latest | jq -r .tag_name | sed 's/^v//')

uv pip install https://github.com/vllm-project/vllm/releases/download/v${VLLM_VERSION}/vllm-${VLLM_VERSION}+cpu-cp38-abi3-manylinux_2_34_x86_64.whl --torch-backend cpu
```

