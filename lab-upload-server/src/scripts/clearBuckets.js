require("dotenv").config({ override: true });

const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function clearBucket(bucketName) {
  let continuationToken = undefined;
  let totalDeleted = 0;

  do {
    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    }));

    const objects = (listRes.Contents || []).map(obj => ({
      Key: obj.Key,
    }));

    if (objects.length === 0) {
      break;
    }

    const deleteRes = await s3.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objects,
        Quiet: true,
      },
    }));

    totalDeleted += objects.length;

    continuationToken = listRes.IsTruncated
      ? listRes.NextContinuationToken
      : undefined;

  } while (continuationToken);

  return totalDeleted;
}

const BUCKETS = [
  process.env.BUCKET_READY,
  process.env.BUCKET_INVALID,
];

(async () => {
  for (const bucket of BUCKETS) {
    try {
      console.log(`\nClearing ${bucket}`);
      const count = await clearBucket(bucket);
      console.log(`Deleted ${count} objects`);
    } catch (e) {
      console.log(`Could not clear ${bucket}: ${e.name}`);
    }
  }
})();
