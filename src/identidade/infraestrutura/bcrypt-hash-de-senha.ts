import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashDeSenha } from '../dominio/portas';

/** Adaptador bcrypt da porta HashDeSenha. */
@Injectable()
export class BcryptHashDeSenha implements HashDeSenha {
  comparar(senhaPlana: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senhaPlana, hash);
  }
}
