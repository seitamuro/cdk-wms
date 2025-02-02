import * as cdk from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkWmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const foundationModel = this.node.tryGetContext("foundationModel");

    const agentsRole = new iam.Role(this, "AgentsRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        agentPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["bedrock:InvokeModel"],
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/${foundationModel}`,
              ],
            }),
          ],
        }),
      },
    });

    const bedrockAgents = new bedrock.CfnAgent(this, "BedrockAgents", {
      agentName: "warehouse-agent-seimiura",
      description: "倉庫業務を行うエージェント",
      agentResourceRoleArn: agentsRole.roleArn,
      foundationModel: foundationModel,
      instruction:
        "あなたは倉庫業務のエージェントです。入力に応じて在庫の検索や登録・更新を行います。使用できる言語は日本語のみです。",
    });
  }
}
