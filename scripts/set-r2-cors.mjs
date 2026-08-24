import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT ?? "https://259ef0caacf892576717a3af86c7d620.eu.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const cors = {
  CORSRules: [
    {
      AllowedOrigins: [
        "http://localhost:3000",
        "https://wedding-photo-game-puce.vercel.app",
      ],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

const out = await s3.send(new PutBucketCorsCommand({ Bucket: "wedding-photo-game", CORSConfiguration: cors }));
console.log("PutBucketCors OK:", out.$metadata.httpStatusCode);
