import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const createResponse = (
  _actionGroup: string,
  _function: string,
  body: string
) => {
  return {
    statusCode: 200,
    response: {
      actionGroup: _actionGroup,
      function: _function,
      functionResponse: {
        responseBody: {
          TEXT: {
            body: body,
          },
        },
      },
    },
  };
};

export const handler = async (event: any = {}): Promise<any> => {
  const _agent = event["agent"];
  const _actionGroup = event["actionGroup"];
  const _function = event["function"];
  const _parameters: any[] = event["parameters"] || [];

  const product_name = _parameters.filter(
    (param) => param.name === "product_name"
  )[0].value;
  const product_num = _parameters.filter((param) => param.name === "num")[0]
    .value;

  const client = new DynamoDBClient();

  try {
    const getCommand: ScanCommand = new ScanCommand({
      TableName: process.env.TABLE_NAME,
      FilterExpression: "#pn = :product_name",
      ExpressionAttributeNames: {
        "#pn": "product_name",
      },
      ExpressionAttributeValues: {
        ":product_name": { S: product_name },
      },
    });

    const getResponse = await client.send(getCommand);
    const items = getResponse.Items!;

    if (items.length === 0) {
      return createResponse(
        _actionGroup,
        _function,
        "商品が見つかりませんでした。"
      );
    }

    const item = items[0];
    const retrievedProductId = item.id.S!;
    const retrievedProductName = item.product_name.S!;

    const updateCommand: UpdateItemCommand = new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        id: { S: retrievedProductId },
      },
      UpdateExpression: "SET #num = :product_num",
      ExpressionAttributeNames: {
        "#num": "num",
      },
      ExpressionAttributeValues: {
        ":product_num": { N: `${product_num}` },
      },
      ReturnValues: "ALL_NEW",
    });

    const updateResponse = await client.send(updateCommand);

    return createResponse(
      _actionGroup,
      _function,
      `倉庫内の${retrievedProductName}を${product_num}個に更新しました。`
    );
  } catch (error) {
    console.error(error);
  }
};
