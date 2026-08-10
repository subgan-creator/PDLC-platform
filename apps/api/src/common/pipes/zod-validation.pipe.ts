import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/**
 * Every endpoint's input is Zod-validated at the schema boundary — no
 * exceptions, per CLAUDE.md. Failures throw a ZodError, which
 * ProblemDetailsFilter turns into a 400 problem+json with a field-level
 * error list. Usage: `@Body(new ZodValidationPipe(createStorySchema)) body: CreateStoryDto`.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    return this.schema.parse(value) as z.infer<TSchema>;
  }
}
