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

Use `npm run configure` as the main setup TUI. It can add OpenAI, Gemini, Ollama, or custom OpenAI-compatible providers.

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

`npm run configure` supports OpenAI, Gemini, Ollama, and custom OpenAI-compatible providers. OpenAI uses OpenCode's built-in `openai` provider. Gemini uses OpenCode's built-in `google` provider. Custom/local providers still use explicit config.
