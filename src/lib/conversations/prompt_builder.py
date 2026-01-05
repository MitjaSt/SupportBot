"""
Enhanced prompt construction with conversation history.
Builds prompts that include context from previous turns.
"""

from src.lib.conversations.conversation_state import CollectionState, Message


def format_conversation_history(messages: list[Message], max_turns: int = 5) -> str:
    """
    Format conversation history for inclusion in prompts.

    Args:
        messages: List of Message objects
        max_turns: Maximum number of recent turns to include

    Returns:
        Formatted conversation history string
    """
    if not messages:
        return ""

    # Take only the most recent messages
    recent = messages[-max_turns * 2 :] if len(messages) > max_turns * 2 else messages

    lines = []
    for msg in recent:
        role = "User" if msg.role == "user" else "Assistant"
        lines.append(f"{role}: {msg.content}")

    return "\n".join(lines)


def inject_collection_instructions(state: str) -> str | None:
    """
    Get state-specific instructions for the LLM.

    Args:
        state: Current CollectionState value

    Returns:
        Instruction string or None
    """
    instructions = {
        CollectionState.OFFERING.value: """
You are currently offering a callback to the user.
Ask politely if they would like our support team to call them.
Keep the offer friendly and not pushy.
""".strip(),
        CollectionState.COLLECTING_USER_PHONE.value: """
You are collecting the user's phone number.
Ask for their phone number in a friendly way.
The user should provide a UK phone number.
If they provide an invalid format, politely ask them to provide it again.
""".strip(),
        CollectionState.COLLECTING_USER_NAME.value: """
You are collecting the user's name (optional).
Ask for their name politely.
Make it clear they can skip this if they prefer to remain anonymous.
Accept any reasonable name format.
""".strip(),
        CollectionState.COLLECTING_USER_TIME.value: """
You are collecting the user's preferred call time (optional).
Ask when would be a good time for support to call them.
Accept flexible descriptions like "morning", "afternoon", "evening", or specific times.
Make it clear they can skip this or say "anytime".
""".strip(),
        CollectionState.CONFIRMING.value: """
You are confirming the collected information.
Repeat back the phone number, name (if provided), and preferred time (if provided).
Ask the user to confirm this information is correct.
If they say no or want to change something, you'll restart the collection process.
""".strip(),
    }

    return instructions.get(state)


def build_enhanced_system_prompt(
    base_prompt: str,
    conversation_history: str | None = None,
    collection_state: str | None = None,
    callback_context: str | None = None,
) -> str:
    """
    Build enhanced system prompt with conversation history and collection instructions.

    Args:
        base_prompt: Base SYSTEM_PROMPT
        conversation_history: Formatted conversation history
        collection_state: Current CollectionState value
        callback_context: Additional context about why callback was triggered

    Returns:
        Enhanced system prompt
    """
    prompt_parts = [base_prompt]

    # Add conversation history section
    if conversation_history:
        prompt_parts.append(
            f"""
CONVERSATION HISTORY:
{conversation_history}

Remember the context from this conversation when responding to the user.
""".strip()
        )

    # Add collection instructions if in a collection flow
    if collection_state and collection_state != CollectionState.IDLE.value:
        instructions = inject_collection_instructions(collection_state)
        if instructions:
            prompt_parts.append(
                f"""
CALLBACK COLLECTION STATUS:
{instructions}
""".strip()
            )

    # Add callback context if available
    if callback_context:
        prompt_parts.append(
            f"""
CALLBACK CONTEXT:
{callback_context}
""".strip()
        )

    return "\n\n".join(prompt_parts)
