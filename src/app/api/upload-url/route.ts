import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function POST(req: NextRequest) {
  try {
    const { contentType } = await req.json();
    const ext = ALLOWED_TYPES[contentType as string];
    if (!ext) {
      return NextResponse.json(
        { error: "Nepodporovaný formát obrázku" },
        { status: 400 }
      );
    }

    const key = `submissions/${randomUUID()}.${ext}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return NextResponse.json({
      key,
      uploadUrl,
      publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Nepodařilo se připravit nahrávání" },
      { status: 500 }
    );
  }
}
