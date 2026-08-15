import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { InitiativeComment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import { OutboxService } from '../outbox/outbox.service';
import type { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsRepository extends TenantScopedRepository {
  constructor(
    prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {
    super(prisma);
  }

  /** Flat list, ordered oldest-first; the client threads by `parentCommentId` — one round trip beats N. */
  list(initiativeId: string): Promise<InitiativeComment[]> {
    return this.withTx((tx) =>
      tx.initiativeComment.findMany({
        where: { tenantId: this.tenantId, initiativeId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async create(initiativeId: string, input: CreateCommentDto, actorUserId: string): Promise<InitiativeComment> {
    return this.withTx(async (tx) => {
      const comment = await tx.initiativeComment.create({
        data: { tenantId: this.tenantId, initiativeId, authorId: actorUserId, ...input },
      });
      await this.outbox.emit(tx, {
        tenantId: this.tenantId,
        eventType: 'comment.created',
        entityType: 'InitiativeComment',
        entityId: comment.id,
        initiativeId,
        actorUserId,
        payload: {
          commentId: comment.id,
          parentCommentId: comment.parentCommentId,
          authorId: comment.authorId,
          mentionedUserIds: comment.mentionedUserIds,
        },
      });
      return comment;
    });
  }

  async update(
    initiativeId: string,
    id: string,
    input: UpdateCommentDto,
    actorUserId: string,
  ): Promise<InitiativeComment> {
    return this.withTx(async (tx) => {
      const existing = await tx.initiativeComment.findFirst({ where: { id, initiativeId, tenantId: this.tenantId } });
      if (!existing || existing.deletedAt) throw new NotFoundException(`Comment ${id} not found`);
      if (existing.authorId !== actorUserId) throw new ForbiddenException('Only the author can edit this comment');

      return tx.initiativeComment.update({ where: { id }, data: { ...input, editedAt: new Date() } });
    });
  }

  async softDelete(initiativeId: string, id: string, actorUserId: string): Promise<void> {
    await this.withTx(async (tx) => {
      const existing = await tx.initiativeComment.findFirst({ where: { id, initiativeId, tenantId: this.tenantId } });
      if (!existing || existing.deletedAt) throw new NotFoundException(`Comment ${id} not found`);
      if (existing.authorId !== actorUserId) throw new ForbiddenException('Only the author can delete this comment');

      await tx.initiativeComment.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
