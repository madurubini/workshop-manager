import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GeradorDeId } from '../../dominio/gerador-de-id';

/**
 * Adaptador da porta GeradorDeId sobre o `crypto.randomUUID` do Node. É aqui, na
 * camada de infraestrutura, que o detalhe de geração de id reside — a aplicação
 * só conhece a abstração.
 */
@Injectable()
export class UuidGeradorDeId implements GeradorDeId {
  novo(): string {
    return randomUUID();
  }
}
