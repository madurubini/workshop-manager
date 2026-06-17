import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FiltroExcecaoGlobal } from './compartilhado/erros/filtro-excecao-global';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Prefixo global do contrato: /api/v1
  app.setGlobalPrefix('api/v1');

  // Validação automática dos DTOs (class-validator).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Envelope de erro padrão do contrato.
  app.useGlobalFilters(new FiltroExcecaoGlobal());

  // Swagger em /api/docs.
  const config = new DocumentBuilder()
    .setTitle('Sistema de Oficina — API')
    .setDescription(
      'Atendimento e Execução de Serviços de oficina mecânica (DDD, monolito modular).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documento = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documento);

  const porta = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(porta);
  // eslint-disable-next-line no-console
  console.log(`API ouvindo em http://localhost:${porta}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger em http://localhost:${porta}/api/docs`);
}

void bootstrap();
