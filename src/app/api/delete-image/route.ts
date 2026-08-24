import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (typeof key !== "string" || !key.startsWith("submissions/")) {
      return NextResponse.json({ error: "Neplatný klíč" }, { status: 400 });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Nepodařilo se smazat obrázek" },
      { status: 500 }
    );
  }
}
