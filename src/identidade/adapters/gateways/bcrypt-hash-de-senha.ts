import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashDeSenha } from '../../use-cases/hash-de-senha';

@Injectable()
export class BcryptHashDeSenha implements HashDeSenha {
  private readonly custo = 10;

  comparar(senhaPlana: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senhaPlana, hash);
  }

  gerar(senhaPlana: string): Promise<string> {
    return bcrypt.hash(senhaPlana, this.custo);
  }
}
