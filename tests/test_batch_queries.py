"""
Batch test script to run multiple queries from TESTING.md in parallel.
Processes all questions concurrently and saves results.

Run with make test-batch
"""

import os
import signal
import sys
import time

# Add project root to path for direct script execution
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime

import yaml
from qdrant_client import QdrantClient

from src.lib._shared import EMBED_MODEL, SCORE_THRESHOLD, TOP_K
from src.lib.llm import OLLAMA_MODEL, generate_answer, retrieve_chunks

# Test configuration
MAX_WORKERS = 4  # Parallel processing with separate processes (each loads its own embedding model)
BATCH_RESULTS_DIR = ".cache/batch_tests"

# Test questions from TESTING.md
TEST_QUESTIONS = [
    # Newly diagnosed questions
    "I've just been told I have age-related macular degeneration; what does that actually mean for my sight long term?",
    "The hospital said I have 'dry' macular disease; is that less serious than 'wet' and can it turn into wet?",
    "My consultant mentioned injections for my eyes; how urgent is it to start treatment and what happens if I miss an appointment?",
    "The leaflet was overwhelming; can you explain in simple terms what I should do first after this diagnosis?",
    # Treatment and prognosis questions
    "Will I eventually go completely blind from this macular disease, or will I keep some useful vision?",
    "Are there any new treatments or clinical trials for macular degeneration that I should ask my specialist about?",
    "Is there anything I can change in my lifestyle, like diet or smoking, that could slow this down?",
    "How often should I be seeing my eye clinic, and what symptoms mean I need to call them straight away?",
    # Daily life and practical help
    "I'm really struggling to read and manage my post; what kind of low-vision aids or gadgets could help me at home?",
    "Do you offer any 'skills for seeing' training or tips on using the vision I still have?",
    "Can someone talk me through using my phone or tablet with poor central vision?",
    "Is there any help with transport, shopping, or form-filling for people with macular disease?",
    # Emotional support and family questions
    "I'm feeling very anxious and low since the diagnosis; do you have counselling or someone I can talk to regularly?",
    "Are there local or online support groups where I can meet others with macular disease?",
    "My husband has macular degeneration and I'm his main carer; what support is there for family members like me?",
    "How can I explain this condition to my children or grandchildren so they understand what's happening to my sight?",
    # Service and helpline-specific questions
    "What kind of help can I get from the Macular Society helpline if I call again?",
    "Can you send me information leaflets in large print or audio about macular disease?",
    "How do I join a local Macular Society support group near where I live?",
    "Do you have a befriending or 'check-in' phone service so someone can call me for a chat now and then?",
]


def process_single_query(query: str, query_index: int) -> dict:
    """
    Process a single query and return results with metadata.

    Note: Creates its own QdrantClient for ProcessPoolExecutor compatibility.

    Args:
        query: Question to process
        query_index: Index of the query in the batch

    Returns:
        Dict with query results and metadata
    """
    print(f"[{query_index + 1}] Processing: {query[:60]}...")

    start_time = time.time()

    # Create Qdrant client for this process
    qdrant_client = QdrantClient(host="localhost", port=6333)

    # Retrieve chunks
    chunks = retrieve_chunks(query, qdrant_client)

    if not chunks:
        return {
            "index": query_index,
            "query": query,
            "answer": "No relevant chunks found in Qdrant.",
            "chunks": [],
            "elapsed_seconds": round(time.time() - start_time, 2),
            "status": "no_chunks",
        }

    # Generate answer
    try:
        response_text, _ = generate_answer(query, chunks)
        status = "success"
    except Exception as e:
        response_text = f"Error: {str(e)}"
        status = "error"

    end_time = time.time()

    return {
        "index": query_index,
        "embedding_model": EMBED_MODEL,
        "chunks": chunks,
        "num_chunks": len(chunks),
        "elapsed_seconds": round(end_time - start_time, 2),
        "model": OLLAMA_MODEL,
        "status": status,
        "query": query,
        "answer": response_text,
    }


def save_batch_results(results: list[dict], batch_timestamp: str):
    """Save batch test results to YAML file."""
    os.makedirs(BATCH_RESULTS_DIR, exist_ok=True)

    filename = f"{BATCH_RESULTS_DIR}/batch_{batch_timestamp}.yaml"

    # Summary statistics
    successful = sum(1 for r in results if r["status"] == "success")
    no_chunks = sum(1 for r in results if r["status"] == "no_chunks")
    errors = sum(1 for r in results if r["status"] == "error")
    total_time = sum(r["elapsed_seconds"] for r in results)
    avg_time = total_time / len(results) if results else 0

    summary = {
        "batch_timestamp": batch_timestamp,
        "total_queries": len(results),
        "successful": successful,
        "no_chunks": no_chunks,
        "errors": errors,
        "total_elapsed_seconds": round(total_time, 2),
        "average_seconds_per_query": round(avg_time, 2),
        "model": OLLAMA_MODEL,
        "embedding_model": EMBED_MODEL,
        "top_k": TOP_K,
        "score_threshold": SCORE_THRESHOLD,
    }

    output = {"summary": summary, "results": results}

    with open(filename, "w", encoding="utf-8") as f:
        yaml.dump(output, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return filename


def main():
    """Run batch testing of all test questions"""
    print("=" * 80)
    print("Batch Query Testing")
    print("=" * 80)

    print(f"\nFound {len(TEST_QUESTIONS)} questions")
    print(f"Running with {MAX_WORKERS} parallel workers")
    print(f"Model: {OLLAMA_MODEL}")
    print(f"Embedding: {EMBED_MODEL}")
    print("=" * 80 + "\n")

    batch_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results = []

    # Process queries in parallel
    start_total = time.time()

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all queries
        future_to_query = {
            executor.submit(process_single_query, q, idx): (q, idx)
            for idx, q in enumerate(TEST_QUESTIONS)
        }

        # Collect results as they complete
        for future in as_completed(future_to_query):
            try:
                result = future.result()
                results.append(result)

                # Print progress
                status_emoji = "✓" if result["status"] == "success" else "✗"
                print(
                    f"{status_emoji} [{result['index'] + 1}/{len(TEST_QUESTIONS)}] "
                    f"{result['elapsed_seconds']:.2f}s - {result['query'][:60]}..."
                )

            except Exception as e:
                query, idx = future_to_query[future]
                print(f"✗ [{idx + 1}] Exception: {e}")
                results.append(
                    {
                        "index": idx,
                        "query": query,
                        "answer": f"Exception: {str(e)}",
                        "chunks": [],
                        "num_chunks": 0,
                        "elapsed_seconds": 0,
                        "status": "exception",
                    }
                )

    total_elapsed = time.time() - start_total

    # Sort results by index to maintain original order
    results.sort(key=lambda x: x["index"])

    # Save results
    output_file = save_batch_results(results, batch_timestamp)

    # Print summary
    print("\n" + "=" * 80)
    print("Batch Testing Complete!")
    print("=" * 80)
    print(f"Total queries: {len(results)}")
    print(f"Successful: {sum(1 for r in results if r['status'] == 'success')}")
    print(f"No chunks: {sum(1 for r in results if r['status'] == 'no_chunks')}")
    print(f"Errors: {sum(1 for r in results if r['status'] == 'error')}")
    print(f"Total time: {total_elapsed:.2f}s")
    print(f"Average per query: {total_elapsed / len(results):.2f}s")
    print(f"\nResults saved to: {output_file}")
    print("=" * 80 + "\n")


def signal_handler(sig, frame):
    print("Exiting script ...")
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)

if __name__ == "__main__":
    main()
