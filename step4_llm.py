import torch, os, sys, requests, threading, json
from qdrant_client import QdrantClient
from transformers import BitsAndBytesConfig
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from shared import EMBED_MODEL, LLM_MODEL, QDRANT_COLLECTION_NAME, TOP_K, MAX_TOKENS, SCORE_THRESHOLD
from transformers import GenerationConfig
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL")
CACHE_DIR_PROMPTS = os.getenv("CACHE_DIR_PROMPTS", "cache/prompts")

# --- CONFIG ---
MAX_NEW_TOKENS = 300

OLLAMA = True

# --- EMBEDDING MODEL ---
embed_model = SentenceTransformer(EMBED_MODEL)

# --- QDRANT CLIENT ---
qdrant = QdrantClient(host="localhost", port=6333)

if OLLAMA == False:
    # --- LOCAL LLM ---
    tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_quant_type="nf4"
    )
    llm_model = AutoModelForCausalLM.from_pretrained(
        LLM_MODEL,
        device_map="auto",
        quantization_config=bnb_config,
        token=os.getenv("HUGGINGFACE_TOKEN", None)
    )


# --- FUNCTIONS ---
def embed(text):
    return embed_model.encode([text])[0]

def retrieve_chunks(query, top_k=TOP_K, score_threshold=SCORE_THRESHOLD):
    query_vec = embed(query)
    result = qdrant.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=query_vec.tolist(),
        limit=top_k,
        score_threshold=score_threshold
    )
    return [hit.payload["text"] for hit in result.points if hit.payload and hit.score >= score_threshold]

def log_prompt_response(query, prompt, response, chunks):
    """Log prompt and response to cache/prompts directory as JSON."""
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}.json"

    log_data = {
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "prompt": prompt,
        "response": response,
        "chunks": chunks,
        "model": "mistral" if OLLAMA else LLM_MODEL
    }

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    return filename



def ollama_generate_answer_stream(query, chunks):
    context = "\n".join(chunks)
    prompt = f"""
You are a phone question-answering assistant. When referring to the person use "you".

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
Give a single concise answer, no repetition, no rephrasing.

If the answer is not in the context, say:
"I do not have information about that. Can I help you with something else?"

Context:
{ context }

Question:
{ query }
"""
    data={
        "model": "mistral",
        "stream": False,
        "prompt": prompt
    }
    response = requests.post(f"{OLLAMA_URL}/api/generate", json.dumps(data))
    response_text = response.json()["response"]
    print(response_text)
    print("\n")

    # Log prompt and response
    log_prompt_response(query, prompt, response_text, chunks)



def generate_answer_stream(query, chunks):
    context = "\n".join(chunks)
    prompt = f"""
You are a question-answering assistant.
Keep your answers concise and to the point.
When referring to the person use "you".
Try to keep the answer as short as possible.

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
Give a single concise answer, no repetition, no rephrasing.

If the answer is not in the context, say:
"I do not have information about that. Can I help you with something else?"

Context:
{ context }

Question:
{ query }
"""
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True)
    inputs = tokenizer(prompt, return_tensors="pt", padding=False, truncation=True, max_length=MAX_TOKENS).to(llm_model.device)
    attention_mask = inputs["attention_mask"]

    gen_config = GenerationConfig(
        max_new_tokens=200,
        do_sample=False, # Disable sampling - deterministic inference
        temperature=0.0,
        repetition_penalty=1.2,
        eos_token_id=tokenizer.eos_token_id
    )

    # Threaded streaming generation
    thread = threading.Thread(target=llm_model.generate, kwargs={
        "inputs": inputs["input_ids"],
        "streamer": streamer,
        "generation_config": gen_config,
        "attention_mask": attention_mask,
        "pad_token_id": tokenizer.eos_token_id
    })
    thread.start()

    for token in streamer:
        print(token, end="", flush=True)
    thread.join()
    print("\n")

# --- MAIN LOOP ---
if __name__ == "__main__":
    print(f"Local RAG assistant ready. Using model: {LLM_MODEL}")
    print("Type 'exit' to quit.")

    try:
        query = sys.argv[1]

        print(f"Query {query}")
        chunks = retrieve_chunks(query)

        print(f"\n💬 Answer:")

        if OLLAMA == True:
            ollama_generate_answer_stream(query, chunks)
        else:
            generate_answer_stream(query, chunks)

    except IndexError:
        while True:
            query = input("\nYour question: ")
            if query.lower() == "exit":
                break

            chunks = retrieve_chunks(query)
            if not chunks:
                print("No relevant chunks found in Qdrant.")
                continue

            print(f"\n💬 Answer:")

            if OLLAMA == True:
                ollama_generate_answer_stream(query, chunks)
            else:
                generate_answer_stream(query, chunks)
