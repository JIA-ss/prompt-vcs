# Prompt-VCS

Git-style version control system for LLM prompts with built-in A/B testing framework.

## Installation

```bash
npm install
npm run build
npm link
```

## Requirements

- Node.js >= 18
- OpenAI API key (for A/B testing): `export OPENAI_API_KEY=your_key`

## Quick Start

### Version Control

```bash
# Initialize a repository
pvc init

# Stage a prompt file
pvc add prompt.txt

# Commit the changes
pvc commit -m "Initial prompt"

# View differences
pvc diff
```

### A/B Testing

```bash
# Create a dataset (JSON format)
cat > dataset.json << 'EOF'
{
  "testCases": [
    { "name": "Greet Alice", "inputs": { "name": "Alice" } },
    { "name": "Greet Bob", "inputs": { "name": "Bob" } }
  ]
}
EOF

# Run A/B test between two commits
pvc test abc123 def456 --dataset dataset.json --save

# View test history
pvc test-log

# View detailed results
pvc test-show abc123-def456-1700000000000
```

## Commands

### Version Control

| Command | Description | Example |
|---------|-------------|---------|
| `init` | Initialize a new repository | `pvc init` |
| `add <path>` | Stage file or directory | `pvc add prompt.txt` |
| `commit -m "msg"` | Create a commit | `pvc commit -m "Update prompt"` |
| `diff [a] [b]` | Show differences | `pvc diff`, `pvc diff HEAD~1` |

### A/B Testing

| Command | Description | Example |
|---------|-------------|---------|
| `test <a> <b>` | Run A/B test between commits | `pvc test abc123 def456 -d dataset.json` |
| `test-log` | List test run history | `pvc test-log -n 10` |
| `test-show <id>` | Show detailed test results | `pvc test-show abc-def-123...` |

### Test Command Options

```bash
pvc test <commit-a> <commit-b> [options]

Options:
  -d, --dataset <path>    Path to dataset file (JSON or CSV) [required]
  -c, --concurrency <n>   Concurrent requests (default: 5)
  -m, --model <model>     OpenAI model (default: gpt-4)
  --save                  Save results to .pvc/test-runs/
```

## Dataset Format

### JSON Format

```json
{
  "testCases": [
    {
      "name": "Test case name",
      "inputs": { "variable": "value" },
      "expectedOutput": "optional expected output"
    }
  ]
}
```

### CSV Format

```csv
name,inputs,expected_output
"Test 1","{""variable"": ""value""}","expected"
```

The `inputs` column should be a JSON object with variable names as keys.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Repository not initialized |
| 3 | Nothing to commit / Missing API key |
| 4 | File not found / Invalid commit |
| 5 | Test execution failed |

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Build
npm run build
```

## Project Structure

```
.pvc/
├── index.json          # Staging area
├── objects/            # Content-addressable storage
│   ├── ab/             # First 2 chars of hash
│   │   └── cdef...     # Remaining hash chars
│   └── ...
├── HEAD                # Current commit pointer
└── test-runs/          # A/B test results
    └── abc-def-ts.json # Test run files
```

## A/B Testing Features

- **Statistical Analysis**: Automatic t-test calculation with p-values
- **Multiple Metrics**: Latency, tokens, cost, and success rate
- **Cost Calculation**: Automatic cost estimation based on model pricing
- **Concurrent Execution**: Configurable concurrency with rate limiting
- **Result Persistence**: Save and compare historical test runs
- **CSV/JSON Datasets**: Flexible dataset formats

## Supported Models

- GPT-4 / GPT-4o / GPT-4o-mini
- GPT-3.5-turbo
- (and their variants)

## License

MIT
