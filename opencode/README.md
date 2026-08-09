# OpenCode Setup Helper

Helper scripts for setting up OpenCode providers, models, and local secrets. The project keeps reusable provider config in `config/opencode.json`, reads local secrets from `env/opencode.env`, then writes the actual OpenCode config to `~/.config/opencode/opencode.json`.

## Usage

```bash
npm install
npm run configure
npm run validate
npm run apply
npm run doctor
```

Use `npm run configure` as the main setup TUI. It can add OpenAI, Gemini, Amazon Bedrock, Ollama, or custom OpenAI-compatible providers.

## Secrets

Copy the example file and fill in real keys:

```bash
cp env/opencode.env.example env/opencode.env
```

Apply reads API keys from `env/opencode.env` using the mappings in `config/secrets.json`, then writes them into the actual OpenCode config:

```bash
npm run apply
```

The real `env/opencode.env` file is ignored so API keys do not end up in the helper project.

`npm run configure` supports OpenAI, Gemini, Amazon Bedrock, Ollama, and custom OpenAI-compatible providers. OpenAI uses OpenCode's built-in `openai` provider. Gemini uses OpenCode's built-in `google` provider. Bedrock uses OpenCode's built-in `amazon-bedrock` provider and AWS's credential chain. Custom/local providers still use explicit config.

### Amazon Bedrock

The Bedrock provider is configured with an AWS region and optional named profile. Credentials are intentionally not copied into `opencode.json`; use the AWS credential chain, `AWS_PROFILE`, access-key environment variables, or `AWS_BEARER_TOKEN_BEDROCK` when launching OpenCode. Request model access in the Bedrock console before selecting a model.

After configuring Bedrock, run `npm run validate` and `npm run apply`, then start OpenCode with the relevant AWS environment variables available. The helper does not automatically load `env/opencode.env` into other processes:

```bash
set -a; source env/opencode.env; set +a
opencode
```
