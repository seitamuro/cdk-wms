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

  console.log(_parameters);
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
    console.log(response);
    const items = response.Items!;

    if (items.length === 0) {
      return createResponse(
        _actionGroup,
        _function,
        "商品が見つかりませんでした。"
      );
    } else {
      return createResponse(
        _actionGroup,
        _function,
        `${items[0].product_name.S}の在庫数は${items[0].num.N}です。`
      );
    }
  } catch (error) {
    console.error(error);
  }
};
