# Easy ECS
AWS CDK Project for Simplifying Deployments of Containerized Web Apps

Welcome to the AWS CDK project designed to streamline the process of deploying containerized web applications on AWS using Elastic Container Service (ECS). This project offers a modular system with three separate CloudFormation stacks, each catering to different deployment needs, allowing for flexible and scalable infrastructure.

## Project Overview

This project aims to:

- Simplify the deployment of containerized web applications on AWS ECS.
- Allow for modular installations, depending on the specific needs of your web app infrastructure.
- Provide observability and monitoring for your deployments.

The project consists of three primary stacks:

1. **ECR Stack**: Facilitates the creation of an image registry on AWS Elastic Container Registry (ECR) to host your container images. This stack is optional and can be deployed independently if you want to manage your own image registry.

2. **Main Stack (ECS Fargate Service)**: Deploys tasks to a Load Balanced Fargate Service within an ECS cluster. This stack is fronted by a CloudFront distribution for caching and global content delivery.

3. **Observability Stack**: Provides a Resource Group for monitoring resources tagged consistently with the project. It configures CloudWatch Real User Monitoring (RUM) to enhance the observability of your web apps.

## Prerequisites

- Ensure you have AWS CLI and AWS CDK installed on your machine.
- Node.js is required to run the CDK commands.
- Basic knowledge of AWS services like ECS, ECR, CloudFront, and CloudWatch.

## Setting Context

This CDK project uses context to configure deployments. Context can be passed via the `cdk.json` file, through the command line, or read from `package.json` if not explicitly provided.

### Required Context Parameters

- **project**: The name of your project. This defaults to the "name" field in `package.json`.
- **environment**: Defines the environment for deployment. This defaults to "dev".
- **version**: The version of your project. This defaults to the "version" field in `package.json`.
- **ecrRepoName**: The name of the ECR repository as `namespace/repo-name`. This defaults to `nginx/nginx`.
- **ecrImageTag**: The tag of the image to deploy. This defaults to `latest`.
- **domainName**: The domain name the Cloudwatch RUM will monitor. This defaults to `localhost`.

Example of setting context in `cdk.json`:

```json
{
  "context": {
    "project": "my-web-app",
    "environment": "prod",
    "version": "1.0.0",
    "ecrRepoName": "user/my-ecr-repo",
    "ecrImageTag": "6",
    "domainName": "my-web-app.com"
  }
}
```

## Deployment

You can deploy each stack individually based on your requirements using the CDK CLI.

**Deploy the entire project:**

```sh
cdk deploy --all --context ecrRepoName=some/image
```

**Deploy a specific stack:**

```sh
cdk deploy <stack-name> --context project=my-web-app ...
```

## Cleanup

After testing or when no longer needed, ensure to clean up resources to avoid unnecessary charges:

```sh
cdk destroy --all
```

## Additional Information

To learn more about each AWS service used in this project, you can visit the following links:

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/index.html)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/index.html)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)

## Contribution

Contributions to this project are welcome. Please open an issue or submit a pull request with your enhancements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

By using this CDK project, deploying and managing containerized web applications on AWS becomes a streamlined and modular process, allowing you to focus on building your web app while AWS manages the infrastructure.
