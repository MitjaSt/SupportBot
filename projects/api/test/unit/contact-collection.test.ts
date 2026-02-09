import { describe, it, expect } from 'vitest';
import { ContactCollectionService } from '../../src/modules/contact-collection/contact-collection.service';
import { ConfigService } from '../../src/config/config.service';

describe('ContactCollectionService', () => {
  const config = new ConfigService();
  const service = new ContactCollectionService(config);

  describe('validatePhoneNumber', () => {
    it('should validate UK mobile numbers', () => {
      const result = service.validatePhoneNumber('07123456789');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('phone');
      expect(result.value).toBe('07123456789');
    });

    it('should validate UK mobile numbers with +44', () => {
      const result = service.validatePhoneNumber('+447123456789');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('phone');
    });

    it('should validate UK landline numbers', () => {
      const result = service.validatePhoneNumber('01234567890');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('phone');
    });

    it('should handle phone numbers with spaces and dashes', () => {
      const result = service.validatePhoneNumber('07123 456 789');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('07123456789');
    });

    it('should reject invalid phone numbers', () => {
      const result = service.validatePhoneNumber('12345');
      expect(result.isValid).toBe(false);
      expect(result.validationMessage).toBeDefined();
    });

    it('should reject phone numbers that are too short', () => {
      const result = service.validatePhoneNumber('0712345');
      expect(result.isValid).toBe(false);
      expect(result.validationMessage).toContain('too short');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = service.validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('email');
      expect(result.value).toBe('user@example.com');
    });

    it('should convert email to lowercase', () => {
      const result = service.validateEmail('User@Example.COM');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('should reject invalid email addresses', () => {
      const result = service.validateEmail('not-an-email');
      expect(result.isValid).toBe(false);
      expect(result.validationMessage).toBeDefined();
    });

    it('should reject email without @ symbol', () => {
      const result = service.validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = service.validateEmail('user@');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateContact', () => {
    it('should auto-detect email addresses', () => {
      const result = service.validateContact('test@example.com');
      expect(result.type).toBe('email');
      expect(result.isValid).toBe(true);
    });

    it('should auto-detect phone numbers', () => {
      const result = service.validateContact('07123456789');
      expect(result.type).toBe('phone');
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed input gracefully', () => {
      const emailResult = service.validateContact('  user@example.com  ');
      expect(emailResult.type).toBe('email');
      expect(emailResult.isValid).toBe(true);

      const phoneResult = service.validateContact('  07123 456 789  ');
      expect(phoneResult.type).toBe('phone');
      expect(phoneResult.isValid).toBe(true);
    });
  });
});
