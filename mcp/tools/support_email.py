def schema():
    return {
        "description": "Notify support to contact a user after the conversation",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "conversation_history": {"type": "string"},
                "preferred_contact_time": {"type": "string"},
            },
            "required": ["summary", "conversation_history"],
        },
    }


def handler(summary, conversation_history, preferred_contact_time=None):
    print("=== MCP TOOL: send_support_email ===")
    print("Summary:", summary)
    print("Preferred contact time:", preferred_contact_time)
    print("Conversation history:")
    print(conversation_history)
