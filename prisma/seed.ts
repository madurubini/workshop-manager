import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'gestor';
  const senhaPlana = 'gestor123';
  const senhaHash = await bcrypt.hash(senhaPlana, 10);

  await prisma.usuario.upsert({
    where: { username },
    update: {},
    create: {
      username,
      senhaHash,
      papel: 'GESTOR',
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seed concluído. Usuário administrativo criado: username="${username}" senha="${senhaPlana}" (papel GESTOR).`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
