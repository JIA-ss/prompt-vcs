# Prompt Version Control System (prompt-vcs)

> Git-like version control for prompt engineering

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Problem

Teams using LLMs struggle with:
- Losing track of which prompt version performs best
- No systematic way to A/B test prompts
- Difficulty collaborating on prompt iterations
- Missing context on why prompts were changed

## Solution

`prompt-vcs` brings git-like workflows to prompt engineering:

```bash
# Initialize a prompt repository
pvc init

# Add and commit a prompt
pvc add prompts/customer-support.txt
pvc commit -m "Add empathy statement"

# Compare versions
pvc diff HEAD~1

# Run A/B test
pvc test --variants HEAD~1,HEAD --dataset test-queries.json

# View performance history
pvc log --metrics
```

## Features

- 📝 **Version prompts** with meaningful commits
- 🧪 **A/B test** different versions
- 📊 **Track metrics** per version (latency, cost, quality)
- 🔀 **Branch and merge** prompt experiments
- 🤝 **Collaborate** with team reviews
- 🔗 **CI/CD integration** with GitHub Actions

## Installation

```bash
npm install -g @oss-ai/prompt-vcs
```

## Quick Start

```bash
# Initialize in your project
cd my-ai-project
pvc init

# Track a prompt
pvc track prompts/greeting.txt

# Edit the prompt, then commit
pvc commit -m "Make greeting more friendly"

# View history
pvc log
```

## Configuration

Create `.pvc/config.yaml`:

```yaml
provider: openai
model: gpt-4
metrics:
  - latency
  - cost
  - quality_score
evaluation:
  method: llm_judge
  criteria: relevance,accuracy,tone
```

## Roadmap

- [ ] v0.1.0 - Core versioning (init, add, commit, diff)
- [ ] v0.2.0 - A/B testing framework
- [ ] v0.3.0 - Metrics tracking
- [ ] v0.4.0 - GitHub Actions integration
- [ ] v1.0.0 - Team collaboration features

## License

MIT © OSS AI Tools
