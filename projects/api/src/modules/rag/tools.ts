import type OpenAI from 'openai';

/**
 * Tool definitions for OpenAI function calling
 */
export const RAG_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'collect_contact_information',
      description:
        'Collect and validate contact information (phone number or email) from the user when they request a callback or want to be contacted. Use this when the user explicitly asks for a call back, wants someone to contact them, or provides contact details.',
      parameters: {
        type: 'object',
        properties: {
          contact_value: {
            type: 'string',
            description:
              'The phone number or email address provided by the user. Can be in various formats (e.g., "07123 456789", "+44 7123456789", "user@example.com").',
          },
          user_message: {
            type: 'string',
            description:
              "The user's message or context around why they want to be contacted.",
          },
        },
        required: ['contact_value'],
        additionalProperties: false,
      },
    },
  },
];

/**
 * System prompt extension for tool usage
 */
export const TOOL_USAGE_INSTRUCTIONS = `

You have access to the following tools:

1. **collect_contact_information**: Use this when a user asks for a callback or wants to be contacted.
   - Ask for their phone number or email if they haven't provided it yet
   - Once they provide contact info, use this tool to validate and store it
   - If validation fails, explain the issue and politely ask for the correct format
   - If validation succeeds, confirm they will be contacted on the next working day

IMPORTANT:
- Only use the contact collection tool when the user EXPLICITLY requests a callback or provides contact information
- Do NOT proactively offer callbacks - wait for the user to ask
- Be polite and explain that someone from the RAG Project will contact them
- After successful contact collection, thank them and confirm the next steps
`;
