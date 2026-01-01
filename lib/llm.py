"""
Shared LLM and RAG functionality.
Used by step4_llm.py and test_batch_queries.py.
"""

import os
import threading
import time
from datetime import datetime
from typing import Optional

import requests
import yaml
from dotenv import load_dotenv
from loguru import logger
from sentence_transformers import SentenceTransformer

from lib.callback_flow import CallbackFlowManager
from lib.conversation_state import CollectionState, ConversationStateManager, UserInfo
from lib.prompt_builder import format_conversation_history, inject_collection_instructions
from mcp import ToolDispatcher, ToolRegistry
from mcp.tools import support_email
from shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, SCORE_THRESHOLD, TOP_K

# Initialize global tool registry and register tools
registry = ToolRegistry()
registry.register(
    name="send_support_email", schema=support_email.schema(), handler=support_email.handler
)
dispatcher = ToolDispatcher(registry)

load_dotenv()

# Configuration from environment
OLLAMA_URL = os.environ["OLLAMA_URL"]
OLLAMA_MODEL = os.environ["OLLAMA_MODEL"]
OLLAMA_TIMEOUT = int(os.environ["OLLAMA_TIMEOUT"])
CACHE_DIR_PROMPTS = os.environ["CACHE_DIR_PROMPTS"]

# System prompt for RAG
SYSTEM_PROMPT = """
INSTRUCTIONS:
- You are a question-answering assistant for Macular Society, speak like a human would over the phone. Be polite and friendly.
- Always reflect the user's intent and language before responding.
- Be honest about limits without sounding authoritative or defensive.
- Follow the user's lead, acknowledge emotions before solving problems, and never end the conversation without offering a next step or alternative.
- Keep your answers concise, as short as possible and to the point - you are answering on a phone.
- When referring to the "caller" use "you".
- Give a single concise answer, no repetition, no rephrasing.
- If the answer is not in the context or you are not sure, say: "I do not have information about that. Can I help you with something else?"

If the user agrees to being contacted by support, you MUST call the tool send_support_email.
Do not describe the action in text.

Use ONLY the context below to answer.
Do NOT attempt to provide any information outside the context. Do not guess.
""".strip()

# Thread-local storage for embedding model (prevents threading issues)

_thread_local = threading.local()


def get_embed_model():
    """Get or initialize the embedding model (thread-local singleton pattern)."""
    if not hasattr(_thread_local, "embed_model"):
        _thread_local.embed_model = SentenceTransformer(EMBED_MODEL)
    return _thread_local.embed_model


def embed_query(text: str):
    """Embed a text query using the sentence transformer model."""
    model = get_embed_model()
    return model.encode([text])[0]


def retrieve_chunks(
    query: str, qdrant_client, top_k: int = TOP_K, score_threshold: float = SCORE_THRESHOLD
) -> list[str]:
    """
    Retrieve relevant chunks from Qdrant for a given query.

    Args:
        query: The search query
        qdrant_client: QdrantClient instance
        top_k: Number of results to return
        score_threshold: Minimum similarity score

    Returns:
        List of text chunks
    """
    query_vec = embed_query(query)
    result = qdrant_client.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=query_vec.tolist(),
        limit=top_k,
        score_threshold=score_threshold,
    )
    return [
        hit.payload["text"] for hit in result.points if hit.payload and hit.score >= score_threshold
    ]


def generate_answer(
    query: str,
    chunks: list[str],
    conversation_history: str | None = None,
    collection_instructions: str | None = None,
    user_info: Optional["UserInfo"] = None,
) -> tuple[str, str]:
    """
    Generate answer using Ollama API with conversation context.

    Args:
        query: User's question
        chunks: Retrieved context chunks
        conversation_history: Formatted conversation history (optional)
        collection_instructions: State-specific collection instructions (optional)
        user_info: Collected user information for tool calls (optional)

    Returns:
        Tuple of (response_text, full_prompt)
    """

    rag_context = "\n".join(chunks)

    tools = registry.get_schemas()

    # Build messages array with enhanced context
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history if available
    if conversation_history:
        messages.append(
            {"role": "system", "content": f"CONVERSATION HISTORY:\n{conversation_history}"}
        )

    # Add RAG context
    messages.append({"role": "system", "content": f"RETRIEVED CONTEXT:\n{rag_context}"})

    # Add collection instructions if in flow
    if collection_instructions:
        messages.append({"role": "system", "content": collection_instructions})

    # Add user query
    messages.append({"role": "user", "content": query})

    data = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": messages,
        "tools": tools,
    }

    response = requests.post(f"{OLLAMA_URL}/api/chat", json=data, timeout=OLLAMA_TIMEOUT)
    response.raise_for_status()
    response_json = response.json()

    logger.debug(f"OLLAMA response JSON: {response_json}")  # Debugging line

    message = response_json.get("message", {})
    response_text = message.get("content", "")
    tool_calls = message.get("tool_calls", [])

    # Handle tool calls if present
    if tool_calls:
        logger.debug(f"Tool calls detected: {tool_calls}")

        # Extract tool calls in the format expected by dispatcher
        formatted_tool_calls = []
        for tool_call in tool_calls:
            if "function" in tool_call:
                tool_name = tool_call["function"]["name"]
                tool_args = tool_call["function"].get("arguments", {})

                # Inject user info if calling send_support_email
                if tool_name == "send_support_email" and user_info:
                    if user_info.phone:
                        tool_args["phone_number"] = user_info.phone
                    if user_info.name:
                        tool_args["name"] = user_info.name
                    if user_info.preferred_call_time:
                        tool_args["preferred_contact_time"] = user_info.preferred_call_time

                formatted_tool_calls.append({"name": tool_name, "arguments": tool_args})

        # Execute the tools
        if formatted_tool_calls:
            dispatcher.dispatch(formatted_tool_calls)

            # If there's no content but there are tool calls, provide a response
            if not response_text:
                response_text = "I've notified our support team to contact you."

    return (
        response_text,
        f"""
[SYSTEM]
{SYSTEM_PROMPT}

[RAG_CONTEXT]
{rag_context}

[USER QUESTION]
{query}
""",
    )


def sanitize_filename(text: str, max_length: int = 50) -> str:
    import re

    # Replace whitespace with underscores
    text = re.sub(r"\s+", "_", text)
    # Remove invalid filename characters
    text = re.sub(r'[<>:"/\\|?*]', "", text)
    # Limit length
    text = text[:max_length]
    # Remove trailing underscores or dots
    text = text.rstrip("_.")
    return text.lower()


def log_prompt_response(
    query: str, prompt: str, response: str, chunks: list[str], start_time: float, end_time: float
) -> str:
    """
    Log prompt and response to cache/prompts directory as YAML.

    Returns:
        Path to saved log file
    """
    os.makedirs(CACHE_DIR_PROMPTS, exist_ok=True)

    # Create filename from timestamp and sanitized query
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_query = sanitize_filename(query)
    filename = f"{CACHE_DIR_PROMPTS}/{timestamp}_{sanitized_query}.yaml"

    log_data = {
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.fromtimestamp(end_time).isoformat(),
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "chunks": chunks,
        "query": query,
        "response": response,
        "elapsed_seconds": round(end_time - start_time, 2),
    }

    with open(filename, "w", encoding="utf-8") as f:
        yaml.dump(log_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    return filename


def process_query(
    query: str,
    qdrant_client,
    session_id: str | None = None,
    state_manager: Optional["ConversationStateManager"] = None,
    verbose: bool = True,
) -> dict:
    """
    Process a complete RAG query with optional conversation state management.

    Returns:
        Dict with query results
    """
    start_time = time.time()

    # Initialize conversation components if session provided
    session = None
    callback_flow = None
    conversation_history_str = None
    collection_instructions_str = None
    user_info = None

    if session_id and state_manager:
        # Get or create session (session_id is guaranteed not None here)
        session = state_manager.get_session(session_id)
        if not session:
            session = state_manager.create_session(session_id)

        # Add user message to history
        state_manager.add_message(session_id, "user", query)

        # Initialize callback flow manager
        callback_flow = CallbackFlowManager(state_manager)

        # Get conversation history for context
        messages = state_manager.get_messages(session_id, limit=5)
        if messages:
            conversation_history_str = format_conversation_history(
                messages[:-1]
            )  # Exclude current query

        # Get collection instructions if in flow
        if session.collection_state != CollectionState.IDLE.value:
            collection_instructions_str = inject_collection_instructions(session.collection_state)

        # Get user info for tool calls
        user_info = state_manager.get_user_info(session_id)

    # Retrieve chunks
    chunks = retrieve_chunks(query, qdrant_client)

    if not chunks:
        if verbose:
            logger.debug("No relevant chunks found in Qdrant.")

        # Still add response to history if in session
        if session_id and state_manager:
            state_manager.add_message(
                session_id, "assistant", "No relevant chunks found in Qdrant."
            )

        return {
            "query": query,
            "answer": "No relevant chunks found in Qdrant.",
            "chunks": [],
            "elapsed_seconds": round(time.time() - start_time, 2),
            "status": "no_chunks",
        }

    # Check if we should offer callback (only if session active)
    if (
        session_id
        and state_manager
        and session
        and callback_flow
        and session.collection_state == CollectionState.IDLE.value
        and callback_flow.should_offer_callback(query, chunks, session)
    ):
        state_manager.update_collection_state(session_id, CollectionState.OFFERING)
        session = state_manager.get_session(session_id)  # Refresh session
        assert session is not None, "Session should exist after state update"
        collection_instructions_str = inject_collection_instructions(session.collection_state)
        logger.debug(f"Callback offer triggered for session {session_id}")

    # Generate answer with conversation context
    try:
        response_text, prompt = generate_answer(
            query, chunks, conversation_history_str, collection_instructions_str, user_info
        )
        status = "success"
    except Exception as e:
        response_text = f"Error: {str(e)}"
        prompt = ""
        status = "error"

    # Process response if in collection flow
    if (
        session_id
        and state_manager
        and session
        and callback_flow
        and session.collection_state != CollectionState.IDLE.value
    ):
        result = callback_flow.process_user_response(session, query)
        action = result.get("action")
        extracted_data = result.get("extracted_data", {})

        if action == "retry":
            # Invalid input, ask again
            error_msg = result.get("error", "Please try again.")
            response_text = f"{error_msg} {callback_flow.get_next_collection_prompt(session)}"
        elif action in ["continue", "complete", "cancel", "restart"]:
            # Advance state machine
            callback_flow.advance_state(session, extracted_data, action)
            session = state_manager.get_session(session_id)  # Refresh session
            assert session is not None, "Session should exist after state update"

            if action == "cancel":
                response_text = "No problem! Is there anything else I can help you with?"
            elif action == "restart":
                response_text = (
                    result.get("message", "Let's start over.")
                    + " "
                    + callback_flow.get_next_collection_prompt(session)
                )
            elif session.collection_state == CollectionState.COMPLETE.value:
                # Collection complete - tool should have been called
                response_text = "Perfect! Our support team will call you soon."
                # Reset to IDLE after tool call
                state_manager.update_collection_state(session_id, CollectionState.IDLE)
            elif session.collection_state != CollectionState.IDLE.value:
                # Continue to next step
                next_prompt = callback_flow.get_next_collection_prompt(session)
                if next_prompt:
                    response_text = f"Thank you. {next_prompt}"

    end_time = time.time()

    # Add assistant response to history
    if session_id and state_manager:
        state_manager.add_message(session_id, "assistant", response_text)

    # Log the interaction
    if status == "success":
        log_prompt_response(query, prompt, response_text, chunks, start_time, end_time)

    if verbose:
        logger.info("\n💬 Answer:")
        logger.info(response_text)
        logger.info(f"\n⏱️  Response time: {end_time - start_time:.2f}s")

    return {
        "query": query,
        "answer": response_text,
        "chunks": chunks,
        "elapsed_seconds": round(end_time - start_time, 2),
        "status": status,
        "model": OLLAMA_MODEL,
        "embedding_model": EMBED_MODEL,
        "session_id": session_id if session else None,
        "collection_state": session.collection_state if session else None,
    }
