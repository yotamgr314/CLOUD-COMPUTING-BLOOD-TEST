require("dotenv").config({ override: true });

const {
    S3Client,
    CreateBucketCommand,
    HeadBucketCommand,
} = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION;

const BUCKETS = [
  process.env.BUCKET_READY,
  process.env.BUCKET_INVALID,
];

const s3 = new S3Client({ region: REGION });

async function ensureBucketExists(bucketName) {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket exists: ${bucketName}`);
    } catch (err) {
        if (err.$metadata?.httpStatusCode === 404) {
            console.log(`Creating bucket: ${bucketName}`);
            await s3.send(
                new CreateBucketCommand({
                    Bucket: bucketName,
                    CreateBucketConfiguration: {
                        LocationConstraint: REGION,
                    },
                })
            );
            console.log(`Created: ${bucketName}`);
        } else {
            throw err;
        }
    }
}

(async () => {
    for (const bucket of BUCKETS) {
        await ensureBucketExists(bucket);
    }
})();