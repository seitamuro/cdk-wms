export const handler = async (event: any = {}): Promise<any> => {
  const _agent = event["agent"];
  const _actionGroup = event["actionGroup"];
  const _function = event["function"];
  const _parameters = event["parameters"] || [];

  console.log(_parameters);

  return {
    statusCode: 200,
    response: {
      actionGroup: _actionGroup,
      function: _function,
      functionResponse: {
        responseBody: {
          TEXT: {
            body: `XXXXの在庫数はYYYです。`,
          },
        },
      },
    },
  };
};
