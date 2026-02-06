"""
Shared LLM and RAG functionality.
Used by step4_llm.py and test_batch_queries.py.
"""

import time
from dataclasses import dataclass, field

import requests
from loguru import logger

from src.lib._shared import EMBED_MODEL, QDRANT_COLLECTION_NAME, SCORE_THRESHOLD, TOP_K
from src.lib.conversations import (
    CallbackFlowManager,
    CollectionState,
    ConversationSession,
    ConversationStateManager,
    format_conversation_history,
    inject_collection_instructions,
)
from src.lib.env import env
from src.lib.logging import log_prompt_response
from src.lib.mcp import ToolDispatcher, ToolRegistry
from src.lib.mcp.tools import support_email as support_email
from src.lib.model import embed_query
from src.lib.observer import get_active_observer

# Initialize global tool registry and register tools
registry = ToolRegistry()
registry.register(
    name="send_support_email", schema=support_email.schema(), handler=support_email.handler
)
dispatcher = ToolDispatcher(registry)

# Initialize the active observer at module load
get_active_observer()


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
    conversation_history_str: str | None = None,
    collection_instructions_str: str | None = None,
) -> tuple[str, str]:
    """
    Generate answer using Ollama API.

    Args:
        query: User's question
        chunks: Retrieved context chunks
        conversation_history_str: Formatted conversation history
        collection_instructions_str: Collection flow instructions

    Returns:
        Tuple of (response_text, full_prompt)
    """
    observer = get_active_observer()
    tools = registry.get_schemas()

    # Get compiled system prompt from observer (includes RAG context and conversation history)
    system_prompt = observer.get_prompt(
        chunks=chunks,
        conversation_history_str=conversation_history_str,
    )

    if not system_prompt:
        raise RuntimeError("Failed to fetch prompt from observer")

    # Append collection instructions if in a collection flow
    if collection_instructions_str:
        system_prompt = f"{system_prompt}\n\n{collection_instructions_str}"

    # Build messages - single system message with all context
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ]

    data = {
        "model": env.ollama.model,
        "stream": False,
        "messages": messages,
        "tools": tools,
    }

    response = requests.post(f"{env.ollama.url}/api/chat", json=data, timeout=env.ollama.timeout)
    response.raise_for_status()
    response_json = response.json()

    logger.debug(f"OLLAMA response JSON: {response_json}")

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
                formatted_tool_calls.append({"name": tool_name, "arguments": tool_args})

        # Check if this is a legitimate support request (has phone number)
        support_tool_calls = [
            tc
            for tc in formatted_tool_calls
            if tc["name"] == "send_support_email" and tc["arguments"].get("phone_number")
        ]

        if support_tool_calls:
            # Legitimate support request - dispatch and notify user
            dispatcher.dispatch(support_tool_calls)
            if not response_text:
                response_text = "I've notified our support team to contact you."
        elif not response_text:
            # LLM put the answer in tool call instead of content - extract it
            # This happens when model is confused about when to use tools
            for tc in formatted_tool_calls:
                if tc["name"] == "send_support_email":
                    summary = tc["arguments"].get("summary", "")
                    if summary:
                        logger.warning("Extracting answer from erroneous tool call summary")
                        response_text = summary
                        break

    return (response_text, system_prompt)


def generate_answer_openai(
    query: str,
    chunks: list[str],
    conversation_history_str: str | None = None,
    collection_instructions_str: str | None = None,
) -> tuple[str, str]:
    """
    Generate answer using OpenAI API.

    Args:
        query: User's question
        chunks: Retrieved context chunks
        conversation_history_str: Formatted conversation history
        collection_instructions_str: Collection flow instructions

    Returns:
        Tuple of (response_text, full_prompt)
    """
    import json

    from openai import OpenAI
    from openai.types.chat import ChatCompletionMessageParam

    observer = get_active_observer()
    tools = registry.get_schemas()

    # Get compiled system prompt from observer (includes RAG context and conversation history)
    system_prompt = observer.get_prompt(
        chunks=chunks,
        conversation_history_str=conversation_history_str,
    )

    if not system_prompt:
        raise RuntimeError("Failed to fetch prompt from observer")

    # Append collection instructions if in a collection flow
    if collection_instructions_str:
        system_prompt = f"{system_prompt}\n\n{collection_instructions_str}"

    # Build messages with proper typing
    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": query},
    ]

    client = OpenAI(api_key=env.openai.api_key)

    # Build request kwargs - only include tools if we have them
    # Note: registry.get_schemas() already returns OpenAI-compatible format
    request_kwargs: dict = {
        "model": env.openai.model,
        "messages": messages,
        "timeout": env.openai.timeout,
    }
    if tools:
        request_kwargs["tools"] = tools

    response = client.chat.completions.create(**request_kwargs)

    message = response.choices[0].message
    response_text = message.content or ""
    tool_calls = message.tool_calls or []

    logger.debug(f"OpenAI response: {response}")

    # Handle tool calls if present
    if tool_calls:
        logger.debug(f"Tool calls detected: {tool_calls}")

        # Extract tool calls in the format expected by dispatcher
        formatted_tool_calls = []
        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            tool_args = (
                json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
            )
            formatted_tool_calls.append({"name": tool_name, "arguments": tool_args})

        # Check if this is a legitimate support request (has phone number)
        support_tool_calls = [
            tc
            for tc in formatted_tool_calls
            if tc["name"] == "send_support_email" and tc["arguments"].get("phone_number")
        ]

        if support_tool_calls:
            # Legitimate support request - dispatch and notify user
            dispatcher.dispatch(support_tool_calls)
            if not response_text:
                response_text = "I've notified our support team to contact you."
        elif not response_text:
            # LLM put the answer in tool call instead of content - extract it
            for tc in formatted_tool_calls:
                if tc["name"] == "send_support_email":
                    summary = tc["arguments"].get("summary", "")
                    if summary:
                        logger.warning("Extracting answer from erroneous tool call summary")
                        response_text = summary
                        break

    return (response_text, system_prompt)


@dataclass
class QueryContext:
    """Context object holding all state for a RAG query."""

    query: str
    session_id: str | None = None
    session: ConversationSession | None = None
    state_manager: ConversationStateManager | None = None
    callback_flow: CallbackFlowManager | None = None
    conversation_history_str: str | None = None
    collection_instructions_str: str | None = None
    chunks: list[str] = field(default_factory=list)
    response_text: str = ""
    prompt: str = ""
    status: str = "pending"
    start_time: float = field(default_factory=time.time)


def _init_conversation_context(ctx: QueryContext) -> None:
    """Initialize conversation state from session manager."""
    if not ctx.session_id or not ctx.state_manager:
        return

    # Get or create session
    ctx.session = ctx.state_manager.get_session(ctx.session_id)
    if not ctx.session:
        ctx.session = ctx.state_manager.create_session(ctx.session_id)

    # Get conversation history BEFORE adding current message
    messages = ctx.state_manager.get_messages(ctx.session_id)
    ctx.conversation_history_str = format_conversation_history(messages)

    # Add user message to history (for next turn)
    ctx.state_manager.add_message(ctx.session_id, "user", ctx.query)

    # Get collection instructions if in a flow
    if ctx.session.collection_state != CollectionState.IDLE.value:
        ctx.collection_instructions_str = inject_collection_instructions(
            ctx.session.collection_state
        )

    # Initialize callback flow manager
    ctx.callback_flow = CallbackFlowManager(ctx.state_manager)


def _retrieve_and_log(ctx: QueryContext, qdrant_client, observer, trace) -> float:
    """Retrieve chunks from vector DB and log to observer. Returns duration in ms."""
    retrieval_start = time.time()
    ctx.chunks = retrieve_chunks(ctx.query, qdrant_client)
    duration_ms = (time.time() - retrieval_start) * 1000

    observer.log_retrieval(
        trace,
        query=ctx.query,
        chunks=ctx.chunks,
        model=EMBED_MODEL,
        duration_ms=duration_ms,
        metadata={"top_k": TOP_K, "score_threshold": SCORE_THRESHOLD},
    )
    return duration_ms


def _check_callback_offer(ctx: QueryContext) -> None:
    """Check if we should proactively offer a callback."""
    if not (ctx.callback_flow and ctx.session and ctx.state_manager and ctx.session_id):
        return

    if ctx.callback_flow.should_offer_callback(ctx.query, ctx.chunks, ctx.session):
        ctx.state_manager.update_collection_state(ctx.session_id, CollectionState.OFFERING)
        ctx.session = ctx.state_manager.get_session(ctx.session_id)
        if ctx.session:
            ctx.collection_instructions_str = inject_collection_instructions(
                ctx.session.collection_state
            )
        logger.debug(f"Callback offer triggered for session {ctx.session_id}")


def _generate_and_log(ctx: QueryContext, observer, trace) -> None:
    """Generate LLM response and log to observer."""
    try:
        generation_start = time.time()

        # Choose backend based on configuration
        if env.openai.enabled:
            ctx.response_text, ctx.prompt = generate_answer_openai(
                ctx.query, ctx.chunks, ctx.conversation_history_str, ctx.collection_instructions_str
            )
            model_name = env.openai.model
        else:
            ctx.response_text, ctx.prompt = generate_answer(
                ctx.query, ctx.chunks, ctx.conversation_history_str, ctx.collection_instructions_str
            )
            model_name = env.ollama.model

        generation_duration_ms = (time.time() - generation_start) * 1000
        ctx.status = "success"

        observer.log_generation(
            trace,
            model=model_name,
            prompt=ctx.prompt,
            response=ctx.response_text,
            duration_ms=generation_duration_ms,
            metadata={
                "has_conversation_history": ctx.conversation_history_str is not None,
                "has_collection_instructions": ctx.collection_instructions_str is not None,
                "backend": "openai" if env.openai.enabled else "ollama",
            },
        )
    except Exception as e:
        ctx.response_text = f"Error: {str(e)}"
        ctx.prompt = ""
        ctx.status = "error"

        observer.log_event(
            trace,
            name="generation_error",
            input_data={"query": ctx.query},
            output_data={"error": str(e)},
        )


def _process_callback_flow(ctx: QueryContext) -> None:
    """Process callback collection flow if active."""
    if not (ctx.callback_flow and ctx.session and ctx.state_manager and ctx.session_id):
        return
    if ctx.session.collection_state == CollectionState.IDLE.value:
        return

    result = ctx.callback_flow.process_user_response(ctx.session, ctx.query)
    ctx.callback_flow.advance_state(ctx.session, result.get("extracted_data", {}), result["action"])

    # Refresh session after state change
    ctx.session = ctx.state_manager.get_session(ctx.session_id)

    # Append collection prompt if still in flow
    if ctx.session and ctx.session.collection_state not in [
        CollectionState.IDLE.value,
        CollectionState.COMPLETE.value,
    ]:
        next_prompt = ctx.callback_flow.get_next_collection_prompt(ctx.session)
        if next_prompt:
            ctx.response_text = (
                f"{ctx.response_text} {next_prompt}" if ctx.response_text else next_prompt
            )


def _finalize_query(ctx: QueryContext, observer, trace, verbose: bool) -> dict:
    """Finalize query: log, update trace, and return result."""
    end_time = time.time()

    # Add assistant response to history
    if ctx.session_id and ctx.state_manager:
        ctx.state_manager.add_message(ctx.session_id, "assistant", ctx.response_text)

    # Log the interaction
    if ctx.status == "success":
        log_prompt_response(
            ctx.query, ctx.prompt, ctx.response_text, ctx.chunks, ctx.start_time, end_time
        )

    if verbose:
        logger.info("\n Answer:")
        logger.info(ctx.response_text)
        logger.info(f"\n Response time: {end_time - ctx.start_time:.2f}s")

    # Update trace with output
    observer.update_trace(trace, output=ctx.response_text)
    observer.flush()

    return {
        "query": ctx.query,
        "answer": ctx.response_text,
        "chunks": ctx.chunks,
        "system_prompt": ctx.prompt,
        "elapsed_seconds": round(end_time - ctx.start_time, 2),
        "status": ctx.status,
        "model": env.openai.model if env.openai.enabled else env.ollama.model,
        "backend": "openai" if env.openai.enabled else "ollama",
        "embedding_model": EMBED_MODEL,
        "session_id": ctx.session_id,
        "collection_state": ctx.session.collection_state if ctx.session else None,
    }


def process_query(
    query: str,
    qdrant_client,
    session_id: str | None = None,
    state_manager: ConversationStateManager | None = None,
    verbose: bool = True,
) -> dict:
    """
    Process a complete RAG query with optional conversation state management.

    Args:
        query: User's question
        qdrant_client: QdrantClient instance
        session_id: Optional session identifier for conversation tracking
        state_manager: Optional ConversationStateManager for multi-turn conversations
        verbose: Whether to log output

    Returns:
        Dict with query results
    """
    # Initialize context and tracing
    ctx = QueryContext(query=query, session_id=session_id, state_manager=state_manager)
    observer = get_active_observer()
    trace = observer.create_trace(
        name="Chat",
        session_id=session_id,
        input=query,
        tags=["macular-society"],
    )

    # Step 1: Initialize conversation context
    _init_conversation_context(ctx)

    # Step 2: Retrieve chunks from vector DB
    _retrieve_and_log(ctx, qdrant_client, observer, trace)

    # Early return if no chunks found
    if not ctx.chunks:
        if verbose:
            logger.debug("No relevant chunks found in Qdrant.")
        return {
            "query": query,
            "answer": "No relevant chunks found in Qdrant.",
            "chunks": [],
            "elapsed_seconds": round(time.time() - ctx.start_time, 2),
            "status": "no_chunks",
        }

    # Step 3: Check for proactive callback offer
    _check_callback_offer(ctx)

    # Step 4: Generate LLM response
    _generate_and_log(ctx, observer, trace)

    # Step 5: Process callback flow if active
    _process_callback_flow(ctx)

    # Step 6: Finalize and return
    return _finalize_query(ctx, observer, trace, verbose)
