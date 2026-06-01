# Assignment 3: Deployment and Integration of AI Agents

**Name:** Meng
**Course:** Remote Development
**Deadline:** May 29th, 2026

---

## Overview

This report documents my process of deploying and integrating AI agents for Assignment 3. The three main tasks were: setting up an online LLM agent using the DeepSeek API for file analysis, deploying a local model via Ollama, and integrating an LLM into VSCode using the Continue extension. Each section below describes my setup steps, the challenges I ran into, and what I learned from the experience.

---

## Part 1: Online Agent — DeepSeek API with File Analysis

### Setup

I obtained a DeepSeek API key from the [DeepSeek platform](https://platform.deepseek.com/). The free tier provides enough credits to experiment with. I chose to use a simple Python script rather than a no-code platform like Dify, because I wanted to understand the API call structure directly and it fit better with the kind of programmatic control I'm used to from my previous projects.

I installed the dependency:

```bash
pip install openai  # DeepSeek uses an OpenAI-compatible API
```

The script reads a local PDF file, extracts its text content, and sends it to DeepSeek along with a question. I tested it with a research paper PDF from one of my courses.

```python
from openai import OpenAI
import pdfplumber

# Extract text from PDF
def extract_pdf_text(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

client = OpenAI(
    api_key="<YOUR_DEEPSEEK_API_KEY>",
    base_url="https://api.deepseek.com"
)

pdf_text = extract_pdf_text("paper.pdf")

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {
            "role": "system",
            "content": "You are a helpful research assistant. Analyze the provided document and answer questions about it."
        },
        {
            "role": "user",
            "content": f"Here is the content of a document:\n\n{pdf_text}\n\nQuestion: What is the main contribution of this paper? Summarize it in 3 bullet points."
        }
    ]
)

print(response.choices[0].message.content)
```

### Result

The model correctly identified the key contributions from the paper and summarized them clearly. The response was well-structured and relevant.

### Challenges

The main issue I ran into was that longer PDFs caused the input to exceed the context window. I resolved this by truncating the extracted text to the first 8,000 characters, which covered the abstract and introduction — enough to answer most questions about the paper's purpose. A more robust solution would be to chunk the document and process sections separately, but for this demo the truncation approach worked fine.

Another small issue was that `pdfplumber` struggled with some scanned PDFs that lacked selectable text. For those I would need OCR, which I did not implement for this assignment.

---

## Part 2: Local Model Deployment — Ollama with Qwen2.5 7B

### Setup

I installed Ollama on my Windows machine running WSL2 (Ubuntu 22.04), which is the same environment I've been using throughout this course.

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

After installation, I pulled the Qwen2.5 7B model. I chose Qwen2.5 7B because it has strong Chinese and English bilingual support, which is relevant to my work, and it fits comfortably in my GPU memory.

```bash
ollama pull qwen2.5:7b
```

Download took about 10–15 minutes depending on network speed. Once downloaded, I started a basic interaction in the terminal:

```bash
ollama run qwen2.5:7b
```

I also tested the REST API that Ollama exposes locally:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Explain the difference between supervised and unsupervised learning in two sentences.",
  "stream": false
}'
```

The model responded correctly and quickly (roughly 2–3 seconds on my machine).

### Challenges

The first issue was a network problem pulling the model from inside WSL2 — the download would stall intermittently. I resolved this by routing traffic through my Clash Verge proxy in WSL2 mirrored networking mode, the same approach I used earlier this semester for GitHub pushes. Setting the proxy environment variables fixed it:

```bash
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```

The second issue was that on first launch, Ollama could not detect the GPU and defaulted to CPU-only mode, which was very slow. I found that the WSL2 CUDA drivers needed to be updated. After running the appropriate CUDA toolkit installation for WSL2, the GPU was recognized and inference speed improved significantly.

---

## Part 3: IDE Integration — Continue Extension in VSCode

### Setup

I installed the [Continue](https://continue.dev/) extension from the VSCode marketplace. Continue supports both remote API models and local Ollama models, which made it a natural choice since I already had both running.

Configuration is done in `~/.continue/config.json`. I set it up to use the local Ollama model as the default (to avoid API costs during casual use) and DeepSeek as a secondary option:

```json
{
  "models": [
    {
      "title": "Qwen2.5 7B (Local)",
      "provider": "ollama",
      "model": "qwen2.5:7b"
    },
    {
      "title": "DeepSeek Chat",
      "provider": "openai",
      "model": "deepseek-chat",
      "apiBase": "https://api.deepseek.com",
      "apiKey": "<YOUR_DEEPSEEK_API_KEY>"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen2.5 7B (Local)",
    "provider": "ollama",
    "model": "qwen2.5:7b"
  }
}
```

### Demo: Code Explanation and Refactoring

I tested Continue on a Python function from my Supply Chain Forecasting project (built earlier this semester). The original function was a bit tangled — it mixed data loading, preprocessing, and model fitting in a single block. I highlighted it in VSCode, opened the Continue chat panel, and asked:

> "Explain what this function does, then refactor it so the data loading and model fitting are separated into two functions."

The model correctly identified that the function was doing too much, explained each logical section, and produced a clean refactored version with clear separation of concerns and added docstrings. The output was ready to use with only minor edits.

This was the most immediately useful part of the whole assignment for me. Having an inline assistant that can read the code in context (rather than me copy-pasting into a chat window) saved real time.

### Challenges

The main friction was that the local model (Qwen2.5 7B) sometimes produced incomplete refactors when the input code was long, cutting off mid-function. Switching to DeepSeek for those cases solved it — the larger online model handles longer contexts more reliably.

---

## Part 4: Documentation & Reflection

### Summary of Setup

| Component | Tool Used | Status |
|---|---|---|
| Online Agent | DeepSeek API + Python script | Working |
| File Analysis | pdfplumber + DeepSeek Chat | Working |
| Local Model | Ollama + Qwen2.5 7B | Working |
| IDE Integration | Continue (VSCode) | Working |

### Comparison: Online vs. Local Model

**Performance:** DeepSeek (online) consistently produced longer, more coherent responses, especially on complex tasks like summarizing a multi-page document. The local Qwen2.5 7B was noticeably weaker on tasks requiring broad world knowledge or long-context reasoning, but was perfectly adequate for shorter coding tasks.

**Speed:** For short prompts, the local model was actually faster due to zero network latency. For longer outputs, DeepSeek was faster in practice because my local GPU is not high-end.

**Ease of use:** The DeepSeek API was extremely easy to integrate — the OpenAI-compatible interface meant I could use existing code with minimal changes. Ollama was also easy to set up once the GPU driver issue was resolved.

**Privacy and cost:** The local model has a clear advantage here. No data leaves my machine, and there are no per-token costs. For sensitive academic work or large batch jobs, I would prefer the local model.

**Usefulness in my workflow:** Both have a place. I plan to use the local model for quick in-editor help during coding, and the online API for heavier analysis tasks like summarizing papers or generating longer draft content.

### Reflection

The most valuable thing I took from this assignment was seeing how thin the integration layer between these tools actually is. The DeepSeek API is a few lines of Python. Ollama is a single terminal command. Continue slots into VSCode in under five minutes. None of this required deep infrastructure work.

What actually takes effort is learning to prompt well. The difference between a useful and a useless response from either model came down almost entirely to how clearly I framed the task — giving context, specifying the output format, and being explicit about constraints. That skill transfers across every model and platform, which makes it worth practicing deliberately.

The one thing I would do differently is set up the Ollama GPU drivers before starting, not after noticing things were slow. Debugging environment issues mid-demo is avoidable with a bit of upfront verification.

---

*Report prepared for Remote Development, Beihang University Hangzhou International Campus, May 2026.*
