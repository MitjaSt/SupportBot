export const ChatMessages = {
  NO_MESSAGE_RECEIVED: "I didn't receive a message. How can I help you?",
  INVALID_CONTACT: 'Invalid contact information provided.',
  contactCollected: (type: 'phone' | 'email', value: string): string =>
    `Thank you for providing your ${type === 'phone' ? 'phone number' : 'email address'}. Someone from the Macular Society will contact you at ${value} on the next working day to discuss your query.`,
} as const;
