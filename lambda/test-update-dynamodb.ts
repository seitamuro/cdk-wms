import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient();

const updateCommand: UpdateItemCommand = new UpdateItemCommand({
  TableName: "CdkWmsStack-WarehouseTable0B0B99EB-TQ1JT319EFRJ",
  Key: {
    id: { S: "1" },
  },
  UpdateExpression: "SET #num = :product_num",
  ExpressionAttributeNames: {
    "#num": "num",
  },
  ExpressionAttributeValues: {
    ":product_num": { N: "99" },
  },
  ReturnValues: "ALL_NEW",
});

const main = async () => {
  try {
    const updateResponse = await client.send(updateCommand);
    console.log(JSON.stringify(updateResponse));
  } catch (error) {
    console.error(error);
  }
};

main();
