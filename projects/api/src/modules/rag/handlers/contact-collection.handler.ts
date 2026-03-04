import { Injectable, Logger } from '@nestjs/common';
import { ChatMessages } from '@/constants/chat-messages';
import { ContactCollectionService } from '../../contact-collection/contact-collection.service';
import {
  IToolHandler,
  ToolExecutionContext,
  ToolResult,
  CollectContactArgs,
  ContactCollectionMetadata,
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
export class ContactCollectionToolHandler
  implements IToolHandler<CollectContactArgs, ContactCollectionMetadata>
{
  readonly name = 'collect_contact_information';
  private readonly logger = new Logger(ContactCollectionToolHandler.name);

  constructor(private readonly contactCollection: ContactCollectionService) {}

  async handle(
    args: CollectContactArgs,
    context: ToolExecutionContext,
  ): Promise<ToolResult<ContactCollectionMetadata>> {
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
      const successMessage = ChatMessages.contactCollected(contactInfo.type, contactInfo.value);

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
        answer: contactInfo.validationMessage || ChatMessages.INVALID_CONTACT,
      };
    }
  }
}
