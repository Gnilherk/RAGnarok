
## Prompt engineering

#### Prompt Tuning
- prompt tuning for language and tonality
  - provide examples in system prompt
- Few-Shot Prompting
  - prepare model with some examples how a conversation could go in specific cases (add to system prompt)
- Chain of thought Promopting
  - provide a chain of thought in system prompt to guide the model in a specific direction / specific solutions
  - > 100B Parameters
  - Zero-Shot CoT: "Let's think step by step"
  - Auto-CoT: "Let's think step by step"
  - Least-to-most prompting

#### Parameter Tuning
- Temperature: 0 (focused & deterministic) to 1 (diverse & creative)
- Top-P: nucleus sampling -diversity vs. coherence
- max length: max amount of tokens in generates text
- frequency / presence penalties: avoid repetition, encourage diversity


#### Router
- Router to select the best model for the task
- like RouterQueryEngine in LlamaIndex
