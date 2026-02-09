import { Injectable, Logger } from '@nestjs/common';
import { ContactCollectionService } from '../../contact-collection/contact-collection.service';
import {
  IToolHandler,
  ToolExecutionContext,
  ToolResult,
} from '../interfaces/tool-handler.interface';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Handler for the collect_contact_information tool
 */
@Injectable()
export class ContactCollectionToolHandler implements IToolHandler {
  readonly name = 'collect_contact_information';
  private readonly logger = new Logger(ContactCollectionToolHandler.name);

  constructor(private readonly contactCollection: ContactCollectionService) {}

  async handle(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    const contactValue = args.contact_value;

    this.logger.log(`Validating contact: ${contactValue}`);

    // Validate contact information
    const contactInfo = this.contactCollection.validateContact(contactValue);

    if (contactInfo.isValid) {
      // Build conversation history
      const conversationTurns: ConversationTurn[] = [
        ...(context.conversationHistory || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        })),
        {
          role: 'user',
          content: context.query,
          timestamp: new Date(),
        },
      ];

      // Save conversation history
      await this.contactCollection.saveConversationHistory(
        contactInfo,
        conversationTurns,
        context.sessionId,
      );

      // Generate success message
      const successMessage =
        contactInfo.type === 'phone'
          ? `Thank you for providing your phone number. Someone from the Macular Society will contact you at ${contactInfo.value} on the next working day to discuss your query.`
          : `Thank you for providing your email address. Someone from the Macular Society will contact you at ${contactInfo.value} on the next working day to discuss your query.`;

      this.logger.log(
        `Contact collected successfully: ${contactInfo.type} - ${contactInfo.value}`,
      );

      return {
        answer: successMessage,
        metadata: {
          contactCollected: {
            type: contactInfo.type,
            value: contactInfo.value,
          },
        },
      };
    } else {
      // Validation failed
      this.logger.warn(`Contact validation failed: ${contactInfo.validationMessage}`);

      return {
        answer: contactInfo.validationMessage || 'Invalid contact information provided.',
      };
    }
  }
}
