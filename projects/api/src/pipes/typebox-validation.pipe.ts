import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export function TypeBoxPipe<T extends TSchema>(schema: T): PipeTransform {
  return {
    transform(value: unknown) {
      if (!Value.Check(schema, value)) {
        const errors = [...Value.Errors(schema, value)].map((e) => `${e.path.replace(/^\//, '')}: ${e.message}`);
        throw new BadRequestException({ message: 'Validation failed', errors });
      }
      return value;
    },
  };
}
