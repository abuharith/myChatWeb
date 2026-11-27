declare module 's3rver' {
  interface S3rverBucket {
    name: string;
  }

  interface S3rverOptions {
    port: number;
    address?: string;
    silent?: boolean;
    directory: string;
    configureBuckets?: S3rverBucket[];
    allowMismatchedSignatures?: boolean;
  }

  export default class S3rver {
    constructor(options: S3rverOptions);
    run(): Promise<unknown>;
    close(): Promise<void>;
  }
}
