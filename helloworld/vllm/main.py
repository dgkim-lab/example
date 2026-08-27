"""
https://docs.vllm.ai/en/latest/getting_started/quickstart/
"""

from vllm import LLM, SamplingParams

def main() -> None:
    prompts = [
        "Hello, my name is",
        "The president of South Korea is",
        "The capital of Seoul is",
        "The future of AI is",
    ]

    sampling_params = SamplingParams(temperature=0.8, top_p=0.95)

    # llm = LLM(model="meta-llama/Llama-3.2-1B-Instruct")
    # llm = LLM(model="google/gemma-4-31B-it")
    llm = LLM(
        model="Qwen/Qwen3-0.6B",
        # On the CPU backend this controls the fraction of host RAM reserved.
        gpu_memory_utilization=0.5,
        max_model_len=4096,
    )

    outputs = llm.generate(prompts, sampling_params)

    for output in outputs:
        prompt = output.prompt
        generated_text = output.outputs[0].text
        print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")


if __name__ == "__main__":
    main()
