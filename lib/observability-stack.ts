import { Stack, StackProps, Tags, CfnOutput, Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnGroup } from "aws-cdk-lib/aws-resourcegroups";
import { CfnAppMonitor } from "aws-cdk-lib/aws-rum";
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
} from "aws-cdk-lib/aws-cognito";
import {
  Role,
  FederatedPrincipal,
  PolicyStatement,
  Effect,
} from "aws-cdk-lib/aws-iam";

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const project = this.node.tryGetContext("project");
    const environment = this.node.tryGetContext("environment");
    const domainName = this.node.tryGetContext("domainName");

    Tags.of(this).add("project", project.toLowerCase());
    Tags.of(this).add("environment", environment.toLowerCase());

    /**
     * Obervability Stack
     * @description This Stack is intended to setup a number of resources intended to give insight into the operations of the project.
     * Resource Group: A resource group is a collection of AWS resources that you can manage as a single unit.
     * CloudWatch RUM: CloudWatch RUM is a service that collects, processes, and stores logs from your applications and services.
     * CloudWatch Dashboard: CloudWatch Dashboards are customizable home pages in the CloudWatch console that you can use to monitor your resources in a single view.
     *
     * @see https://docs.aws.amazon.com/ARG/latest/userguide/resource-groups.html
     * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_RUM.html
     */

    /**
     * Resource Group
     * @memberof ResourceGroup
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_resourcegroups-readme.html
     */
    new CfnGroup(this, `ResourceGroup`, {
      name: `${environment}-${project}`.toLowerCase(),
      resourceQuery: {
        type: "TAG_FILTERS_1_0",
        query: {
          resourceTypeFilters: ["AWS::AllSupported"],
          tagFilters: [
            {
              key: "project",
              values: [`${project}`],
            },
            {
              key: "environment",
              values: [`${environment}`],
            },
          ],
        },
      },
    });

    new CfnOutput(this, "ResourceGroupNameOutput", {
      value: `${environment}-${project}`.toLowerCase(),
      description: "Resource Group Name",
      exportName: `${environment}-${project}-resource-group`.toLowerCase(),
    });

    /**
     * Identity Pool
     * @memberof Cognito
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html
     */
    const rumIdentityPool = new CfnIdentityPool(this, "RumIdentityPool", {
      allowUnauthenticatedIdentities: true,
    });

    /**
     * Unauthenticated Role
     * @memberof IAM
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam-readme.html
     */
    const rumUnauthenticatedRole = new Role(this, "RumUnauthenticatedRole", {
      assumedBy: new FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": rumIdentityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
    });

    rumUnauthenticatedRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["rum:PutRumEvents"],
        resources: [
          `arn:aws:rum:${Aws.REGION}:${Aws.ACCOUNT_ID}:appmonitor/${project.toLowerCase()}`,
        ],
      }),
    );

    /**
     * Identity Pool Role Attachment
     * @memberof Cognito
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html
     */
    const rumIdentityPoolRoleAttachment = new CfnIdentityPoolRoleAttachment(
      this,
      "RumIdentityPoolRoleAttachment",
      {
        identityPoolId: rumIdentityPool.ref,
        roles: {
          unauthenticated: rumUnauthenticatedRole.roleArn,
        },
      },
    );

    /**
     * App Monitor
     * @memberof Rum
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rum-readme.html
     */
    const monitor = new CfnAppMonitor(this, "RumAppMonitor", {
      domain: domainName || "localhost",
      name: project.toLowerCase(),
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: true,
        sessionSampleRate: 1,
        telemetries: ["errors", "performance", "http", "interaction"],
        identityPoolId: rumIdentityPool.ref,
        guestRoleArn: rumUnauthenticatedRole.roleArn,
      },
      cwLogEnabled: true,
    });
  }
}
