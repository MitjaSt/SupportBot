def schema():
    return {
        "description": "Notify support to contact a user after the conversation",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Brief summary of the user's inquiry",
                },
                "conversation_history": {
                    "type": "string",
                    "description": "Full conversation context",
                },
                "phone_number": {
                    "type": "string",
                    "description": "User's phone number for callback (required)",
                },
                "name": {
                    "type": "string",
                    "description": "User's name (optional)",
                },
                "preferred_contact_time": {
                    "type": "string",
                    "description": "Preferred time for callback (optional)",
                },
            },
            "required": ["summary", "conversation_history", "phone_number"],
        },
    }


def handler(summary, conversation_history, phone_number, name=None, preferred_contact_time=None):
    print("\n" + "=" * 60)
    print("=== MCP TOOL: send_support_email ===")
    print("=" * 60)
    print(f"Phone Number: {phone_number}")
    print(f"Name: {name or 'Not provided'}")
    print(f"Preferred Time: {preferred_contact_time or 'Not specified'}")
    print(f"Summary: {summary}")
    print("\nConversation History:")
    print("-" * 60)
    print(conversation_history)
    print("=" * 60)
    print("\n✓ Support notification sent successfully!")
    print("=" * 60 + "\n")

    # TODO: Actual email sending logic
    # - Format email with user info
    # - Send to support team
    # - Log in tracking system
