import "reflect-metadata";
import { resolve } from "node:path";
import { config as loadEnvironment } from "dotenv";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { validateEnvironment } from "./config/environment";

loadEnvironment({ path: resolve(process.cwd(), "../../.env") });

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  if (environment.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: environment.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  if (environment.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("CppStudy API")
      .setVersion("1.0")
      .addCookieAuth(environment.SESSION_COOKIE_NAME)
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(environment.API_PORT, "127.0.0.1");
}

void bootstrap();
