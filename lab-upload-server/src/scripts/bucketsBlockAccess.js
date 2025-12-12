require("dotenv").config({ override: true });

const { S3Client, PutPublicAccessBlockCommand } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;

const BUCKETS = [
  process.env.BUCKET_READY,
  process.env.BUCKET_INVALID,
];

const s3 = new S3Client({ region: REGION });

async function blockPublicAccess(bucket) {
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: bucket,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    },
  }));
}

(async () => {
  for (const bucket of BUCKETS) {
    try {
      await blockPublicAccess(bucket);
      console.log(`Public access blocked: ${bucket}`);
    } catch (e) {
      console.log(`Failed for ${bucket}: ${e.name} (${e.$metadata?.httpStatusCode || "?"})`);
      if (e.name === "NoSuchBucket") {
        console.log(`   → Bucket does not exist. Create it first.`);
      }
      if (e.name === "AccessDenied") {
        console.log(`   → You likely don't have s3:PutBucketPublicAccessBlock permission.`);
      }
    }
  }
})();