import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when an optimistic-concurrency `version` on a PATCH doesn't match
 * the current row. Carries the current record so ProblemDetailsFilter can
 * surface it as `conflict` in the problem+json body — the client's merge
 * prompt renders from that, no extra round trip needed.
 */
export class VersionConflictException extends HttpException {
  constructor(current: unknown) {
    super(
      { message: 'The record has changed since you last loaded it.', current },
      HttpStatus.CONFLICT,
    );
  }
}
