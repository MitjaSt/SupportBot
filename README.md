# Install

## Save requirements
```bash
pip freeze > requirements.txt
```

# Key points / Questions
  How to hold conversation (context)
  Asking subquestions
  What is the expected outcome, how long does it need to be supported?
  How will we know if it works?
  Whats the monthly cost that is acceptable?
  typos
  Pricing - 100 eur for 500mins roughly

# Test questions
* Do I have “wet” or “dry” macular degeneration? Does it affect both eyes?
* What stage is it in, early, intermediate, or advanced?
* What is the likelihood that my AMD will progress?
* What are my treatment options?  Do they include injections and are there new studies of other treatments?
* Can diet, exercise, supplements and other lifestyle changes help slow the progression of macular degeneration?
* Are my children and siblings at risk?  Should they be examined?
* What can I do to stay independent? What should I tell my family?
* How often do I need to get checkups?
* Can you recommend a retinal or macular degeneration specialist, a vision rehabilitation center, and support groups?
* Am I legally blind?  Should I register with the Commission for the Blind?

* What are hallucinations?
* Can you stop the hallucinations caused by CBS?
  - What kind of medication can I get?
  - What are Charles Bonnet hallucinations

* What causes it in people with sight loss?
* My vision is deteriorating and I'm having hallucinations. How can you help?
* Explain NHS-funded mobile eye tests
* How can I get more information about eye tests
* What to do after a macular disease diagnosis
* I was told I have macular degeneration – is that the same as AMD?
* Can you explain this in plain language?

# Process

🎤 User speaks
   ↓
🗣️ Speech-to-Text (ElevenLabs STT)
   ↓
🧠 RAG pipeline
   - embed query
   - retrieve chunks from Qdrant
   - build grounded prompt
   ↓
🤖 LLM (local: Mistral / 3B / 7B)
   ↓
🗣️ Text-to-Speech (ElevenLabs TTS)
   ↓
🔊 Audio reply
