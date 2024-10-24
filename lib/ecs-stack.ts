import { Stack, StackProps, Tags, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  FargateTaskDefinition,
  LogDrivers,
  ContainerDefinition,
  ContainerImage,
} from "aws-cdk-lib/aws-ecs";

import { Repository } from "aws-cdk-lib/aws-ecr";

import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";

import {
  Distribution,
  SecurityPolicyProtocol,
  CachePolicy,
  OriginProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { LoadBalancerV2Origin } from "aws-cdk-lib/aws-cloudfront-origins";

export class EcsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const project = this.node.tryGetContext("project");
    const environment = this.node.tryGetContext("environment");
    const desiredCount = this.node.tryGetContext("desiredCount");

    Tags.of(this).add("project", project.toLowerCase());
    Tags.of(this).add("environment", environment.toLowerCase());

    /**
     * ECS Stack
     * @description This stack creates an ECS cluster with a Fargate task definition. It creates multiple resources:
     * VPC: A Virtual Private Cloud (VPC) is a virtual network dedicated to your AWS account.
     * ECS Cluster: An Amazon ECS cluster is a logical grouping of tasks or services.
     * Fargate Task Definition: A task definition is required to run Docker containers in Amazon ECS.
     * ECS Container Definition: A container definition is used in task definitions to describe the container that is launched as part of a task.
     * Load Balancer with ECS (Fargate) Service: An ECS service enables you to run and maintain a specified number of instances of a task definition simultaneously in an ECS cluster.
     * CloudFront Distribution: Amazon CloudFront is a fast content delivery network (CDN) service.
     *
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container_definition.html
     * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html
     * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
     */

    /**
     * VPC
     * @memberof Ec2
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html
     */
    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1, // NOTE: using the default VPC fails
    });

    /**
     * @memberof Ecs
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
     */
    const cluster = new Cluster(this, "EcsCluster", { vpc: vpc });

    /**
     * @memberof Ecs
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
     */
    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 4096,
      cpu: 1024,
    });

    const ecrRepoName = this.node.tryGetContext("ecrRepoName");
    const ecrImageTag = this.node.tryGetContext("ecrImageTag") || "latest";
    const repo = Repository.fromRepositoryName(
      this,
      "EcrRepository",
      ecrRepoName,
    );

    /**
     * @memberof Ecs
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
     */
    const containerDefinition = new ContainerDefinition(
      this,
      "ContainerDefinition",
      {
        containerName: `${environment}-${project}-container`.toLowerCase(),
        image: ContainerImage.fromEcrRepository(repo, ecrImageTag.toString()), // ContainerImage.fromRegistry("nginx"), to pull from a public registry like Docker Hub
        taskDefinition,
        environment: {}, // Environment variables
        logging: LogDrivers.awsLogs({
          streamPrefix: project.toLowerCase(),
        }),
      },
    );

    containerDefinition.addPortMappings({
      containerPort: 3000,
    });

    /**
     * Faragate Service
     * @memberof EcsPatterns
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns-readme.html
     */
    const albFargateService = new ApplicationLoadBalancedFargateService(
      this,
      "ECSFargate",
      {
        cluster,
        taskDefinition,
        desiredCount: desiredCount || 1,
        publicLoadBalancer: true,
      },
    );

    albFargateService.targetGroup.setAttribute(
      "deregistration_delay.timeout_seconds",
      "30",
    );
    albFargateService.targetGroup.configureHealthCheck({
      path: "/",
      port: "3000",
      healthyHttpCodes: "200",
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      timeout: Duration.seconds(5),
      interval: Duration.seconds(10),
    });

    new CfnOutput(this, "LoadBalancerDNS", {
      value: albFargateService.loadBalancer.loadBalancerDnsName,
      description: "Load Balancer DNS",
    });

    /**
     * CloudFront Distribution
     * @memberof CloudFront
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnOutput.html
     */
    const distribution = new Distribution(this, "CloudFront", {
      comment: `The ${environment.toLowerCase()} Cloud Front Distribution for the ${project.toLowerCase()} service.`,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        origin: new LoadBalancerV2Origin(albFargateService.loadBalancer, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        }),
      },
    });

    new CfnOutput(this, "CloudFrontDomainName", {
      value: distribution.domainName,
      description: "CloudFront Domain Name",
    });
  }
}
