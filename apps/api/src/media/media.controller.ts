import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import type { Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { Public } from "../common/public.decorator";
import type { AuthenticatedUser } from "../common/request-context";
import { Roles } from "../common/roles.decorator";
import { Role } from "../generated/prisma/enums";
import { MediaService } from "./media.service";

class AssetTextDto {
  @IsString() @MaxLength(300) altText = "";
}
type Upload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@ApiTags("admin-assets")
@Roles(Role.ADMIN)
@Controller("admin/assets")
export class AdminAssetsController {
  constructor(private readonly media: MediaService) {}
  @Get() list() {
    return this.media.list();
  }
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Upload,
    @Body() dto: AssetTextDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.media.upload(file, dto.altText ?? "", user);
  }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: AssetTextDto) {
    return this.media.update(id, dto.altText);
  }
  @Delete(":id") remove(@Param("id") id: string) {
    return this.media.remove(id);
  }
}

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Public()
  @Get(":id")
  async read(
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { asset, buffer } = await this.media.read(id);
    response.setHeader("Content-Type", asset.mimeType);
    response.setHeader("Content-Length", buffer.length);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return new StreamableFile(buffer);
  }
}
