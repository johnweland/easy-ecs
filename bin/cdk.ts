#!/opt/homebrew/opt/node/bin/node
import "source-map-support/register";
import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { EcsStack } from "../lib/ecs-stack";
import { EcrStack } from "../lib/ecr-stack";
import { ObservabilityStack } from "../lib/observability-stack";

// Read package.json
const packageJsonPath = path.join(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const app = new cdk.App();

const project = app.node.tryGetContext("project")
  ? app.node.tryGetContext("project")
  : packageJson.name;
app.node.setContext("project", project);

const version = app.node.tryGetContext("version")
  ? app.node.tryGetContext("version")
  : packageJson.version;
app.node.setContext("version", version);

const environment = app.node.tryGetContext("environment")
  ? app.node.tryGetContext("environment")
  : "dev";
app.node.setContext("environment", environment);

new EcrStack(app, `${environment}-${project}-ecr`.toLowerCase(), {
  description: `Container Registry for ${project} on ECS`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new EcsStack(app, `${environment}-${project}-ecs`.toLowerCase(), {
  description: `Deployment Stack for ${project} on ECS`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new ObservabilityStack(
  app,
  `${environment}-${project}-observability`.toLowerCase(),
  {
    description: `Observability Resources for ${project} on ECS`,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
);
