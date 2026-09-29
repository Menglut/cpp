import { Module } from "@nestjs/common";
import { AdminAssetsController, MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  controllers: [AdminAssetsController, MediaController],
  providers: [MediaService],
})
export class MediaModule {}
