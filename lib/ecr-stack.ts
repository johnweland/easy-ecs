import { CfnOutput, Stack, StackProps, Tags, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";

export class EcrStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const project = this.node.tryGetContext("project");
    const environment = this.node.tryGetContext("environment");
    Tags.of(this).add("project", project.toLowerCase());
    Tags.of(this).add("environment", environment.toLowerCase());

    /**
     * ECR Stack
     * @description Elastic Container Registry (ECR) is a fully-managed Docker container registry
     *              that makes it easy for developers to store, manage, and deploy Docker container images.
     *
     * @see https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html
     */

    /**
     * ECR Repository
     * @memberof Ecr
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr-readme.html
     */
    const repository = new ecr.Repository(this, "EcrRepository", {
      repositoryName: `${environment}-${project.toLowerCase()}-ecr-repository`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, "RepositoryURI", {
      value: repository.repositoryUri,
      description: "The URI of the ECR repository",
    });
  }
}
