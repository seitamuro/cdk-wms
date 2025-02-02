import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

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

  const client = new DynamoDBClient();

  const command: ScanCommand = new ScanCommand({
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#pn = :product_name",
    ExpressionAttributeNames: {
      "#pn": "product_name",
    },
    ExpressionAttributeValues: {
      ":product_name": { S: product_name },
    },
  });

  try {
    const response = await client.send(command);
    const items = response.Items!;

    if (items.length === 0) {
      return createResponse(
        _actionGroup,
        _function,
        "商品が見つかりませんでした。"
      );
    } else {
      const item = items[0];
      const inventory_place = item["warehouse_name"].S;
      const product_name = item["product_name"].S;
      const product_num = item["num"].N;
      const seller = item["seller"].S;
      const weight = item["weight"].S;

      return createResponse(
        _actionGroup,
        _function,
        `${product_name}は現在${product_num}個あります。${inventory_place}の倉庫にあります。販売者は${seller}です。重さは${weight}です。`
      );
    }
  } catch (error) {
    console.error(error);
  }
};
