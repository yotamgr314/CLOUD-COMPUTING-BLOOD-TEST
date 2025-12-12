require("dotenv").config({ override: true });

const {
  S3Client,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function listFilesInBucket(bucketName, prefix = "") {
  const files = [];
  let continuationToken = undefined;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    if (res.Contents) {
      for (const obj of res.Contents) {
        files.push({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        });
      }
    }

    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;

  } while (continuationToken);

  return files;
}

const BUCKETS = [
  process.env.BUCKET_READY,
  process.env.BUCKET_INVALID,
];

(async () => {
  for (const bucket of BUCKETS) {
    console.log(`\nBucket: ${bucket}`);
    const files = await listFilesInBucket(bucket);

    if (files.length === 0) {
      console.log("  (empty)");
    }

    for (const f of files) {
      console.log(`  - ${f.key}`);
    }
  }
})();