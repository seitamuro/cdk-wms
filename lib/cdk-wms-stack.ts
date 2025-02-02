import * as cdk from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkWmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const foundationModel = this.node.tryGetContext("foundationModel");

    const warehouseTable = new dynamodb.Table(this, "WarehouseTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const functionRole = new iam.Role(this, "FunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const searchWarehouseFunction = new NodejsFunction(
      this,
      "SearchWarehouseFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        role: functionRole,
        entry: "lambda/search-warehouse-seimiura.ts",
        handler: "handler",
        environment: {
          TABLE_NAME: warehouseTable.tableName,
        },
      }
    );
    warehouseTable.grantReadData(searchWarehouseFunction);

    const updateWarehouseFunction = new NodejsFunction(
      this,
      "UpdateWarehouseFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        role: functionRole,
        entry: "lambda/update-warehouse-seimiura.ts",
        handler: "handler",
        environment: {
          TABLE_NAME: warehouseTable.tableName,
        },
      }
    );
    warehouseTable.grantReadWriteData(updateWarehouseFunction);

    const infoWarehouseFunction = new NodejsFunction(
      this,
      "InfoWarehouseFunction",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        role: functionRole,
        entry: "lambda/info-warehouse-seimiura.ts",
        handler: "handler",
        environment: {
          TABLE_NAME: warehouseTable.tableName,
        },
      }
    );
    warehouseTable.grantReadData(infoWarehouseFunction);

    const agentsRole = new iam.Role(this, "AgentsRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
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
      instruction: `あなたは倉庫業務のエージェントです。入力に応じて在庫の検索や登録・更新を行います。使用できる言語は日本語のみです。
        製品の在庫数を検索するリクエストは製品名{product_name}を使ってアクションを呼び出します。
        製品の在庫を追加するリクエストは製品名{product_name}と数量{num}を使ってアクションを呼び出します。
        製品情報を調べたいリクエストは製品名{product_name}を使ってアクションを呼び出します。
        <example>
        "シャンプーは何個ですか"というリクエストの場合、{product_name}がシャンプーを表します
        "シャンプーを10個登録したい"というリクエストの場合、{product_name}がシャンプー、{num}が10を表します
        "シャンプーの情報を知りたい"というリクエストの場合、{product_name}がシャンプーを表します
        </example>
        `,
      actionGroups: [
        {
          actionGroupName: "search-warehouse-seimiura",
          description: "倉庫情報にある商品の在庫情報を検索する",
          actionGroupState: "ENABLED",
          functionSchema: {
            functions: [
              {
                name: "product_name",
                description: "倉庫情報にある商品の在庫情報を検索する",
                parameters: {
                  product_name: {
                    description: "製品名",
                    type: "string",
                    required: true,
                  },
                },
              },
            ],
          },
          actionGroupExecutor: {
            lambda: searchWarehouseFunction.functionArn,
          },
        },
        {
          actionGroupName: "update-warehouse-seimiura",
          description: "倉庫の在庫情報を更新します",
          actionGroupState: "ENABLED",
          functionSchema: {
            functions: [
              {
                name: "update-warehouse-function-seimiura",
                description: "倉庫の在庫情報を更新します",
                parameters: {
                  product_name: {
                    description: "製品名",
                    type: "string",
                    required: true,
                  },
                  num: {
                    description: "製品の数量",
                    type: "number",
                    required: true,
                  },
                },
              },
            ],
          },
          actionGroupExecutor: {
            lambda: updateWarehouseFunction.functionArn,
          },
        },
        {
          actionGroupName: "info-warehouse-seimiura",
          description: "製品情報を検索します",
          actionGroupState: "ENABLED",
          functionSchema: {
            functions: [
              {
                name: "info-warehouse-function-seimiura",
                description: "製品情報を検索します",
                parameters: {
                  product_name: {
                    description: "製品名",
                    type: "string",
                    required: true,
                  },
                },
              },
            ],
          },
          actionGroupExecutor: {
            lambda: updateWarehouseFunction.functionArn,
          },
        },
      ],
    });

    const bedrockPrincipal = new iam.ServicePrincipal("bedrock.amazonaws.com", {
      conditions: {
        ArnLike: {
          "aws:SourceArn": bedrockAgents.attrAgentArn,
        },
      },
    });
    searchWarehouseFunction.grantInvoke(bedrockPrincipal);
    updateWarehouseFunction.grantInvoke(bedrockPrincipal);
    infoWarehouseFunction.grantInvoke(bedrockPrincipal);
  }
}
