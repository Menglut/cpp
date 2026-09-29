import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AuthenticatedUser } from "../common/request-context";
import { PrismaService } from "../database/prisma.service";

type Upload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};
const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

@Injectable()
export class MediaService {
  private readonly root = resolve(
    process.env.MEDIA_ROOT ?? resolve(process.cwd(), "uploads"),
  );
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.client.contentAsset.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { items: items.map((item) => this.present(item)), nextCursor: null };
  }

  async upload(
    file: Upload | undefined,
    altText: string,
    actor: AuthenticatedUser,
  ) {
    if (!file)
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "이미지 파일을 선택해 주세요.",
      });
    const extension = extensions[file.mimetype];
    if (!extension)
      throw new BadRequestException({
        code: "UNSUPPORTED_IMAGE",
        message: "PNG, JPEG, GIF, WebP 이미지만 업로드할 수 있습니다.",
      });
    if (!matchesSignature(file.buffer, file.mimetype))
      throw new BadRequestException({
        code: "INVALID_IMAGE",
        message: "파일 내용이 이미지 형식과 일치하지 않습니다.",
      });
    const storageKey = `${randomUUID()}.${extension}`;
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, storageKey), file.buffer, {
      flag: "wx",
    });
    const asset = await this.prisma.client.contentAsset.create({
      data: {
        storageKey,
        originalName: file.originalname.slice(0, 255),
        mimeType: file.mimetype,
        fileSize: file.size,
        altText: altText.slice(0, 300),
        uploadedById: actor.id,
      },
    });
    return this.present(asset);
  }

  async read(id: string) {
    const asset = await this.prisma.client.contentAsset.findUnique({
      where: { id },
    });
    if (!asset)
      throw new NotFoundException({
        code: "ASSET_NOT_FOUND",
        message: "이미지를 찾을 수 없습니다.",
      });
    try {
      return {
        asset,
        buffer: await readFile(resolve(this.root, asset.storageKey)),
      };
    } catch {
      throw new NotFoundException({
        code: "ASSET_FILE_NOT_FOUND",
        message: "이미지 파일을 찾을 수 없습니다.",
      });
    }
  }

  async update(id: string, altText: string) {
    await this.require(id);
    return this.present(
      await this.prisma.client.contentAsset.update({
        where: { id },
        data: { altText: altText.slice(0, 300) },
      }),
    );
  }

  async remove(id: string) {
    const asset = await this.require(id);
    await this.prisma.client.contentAsset.delete({ where: { id } });
    await unlink(resolve(this.root, asset.storageKey)).catch(() => undefined);
    return { success: true };
  }

  private async require(id: string) {
    const asset = await this.prisma.client.contentAsset.findUnique({
      where: { id },
    });
    if (!asset)
      throw new NotFoundException({
        code: "ASSET_NOT_FOUND",
        message: "이미지를 찾을 수 없습니다.",
      });
    return asset;
  }

  private present<
    T extends {
      id: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      altText: string;
      createdAt: Date;
    },
  >(asset: T) {
    return {
      id: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      altText: asset.altText,
      createdAt: asset.createdAt,
      url: `/api/v1/media/${asset.id}`,
    };
  }
}

function matchesSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg")
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/gif")
    return ["GIF87a", "GIF89a"].includes(
      buffer.subarray(0, 6).toString("ascii"),
    );
  if (mimeType === "image/webp")
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  return false;
}
