var payload = context.getVariable("response.content");
var payloadObj = JSON.parse(payload);
var newPayload = JSON.stringify(payloadObj.data.languages);
context.setVariable("response.content", newPayload);