const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

exports.handler = async (event) => {
  try {
    const { info, arguments: args, identity } = event;

    switch (info.fieldName) {
      case "registerUser":
        return await registerUser(args, identity);
      case "listUsers":
        return await listUsers(identity);
      case "updateUserRole":
        return await updateUserRole(args, identity);
      case "me":
        return await me(identity);
      default:
        return { error: "Unknown fieldName" };
    }
  } catch (error) {
    console.error("Handler error:", error);
    return { error: error.message || "Internal server error" };
  }
};

function isAdmin(identity) {
  return identity?.claims?.["cognito:groups"]?.includes("admin");
}

async function registerUser({ name, email, role }, identity) {
  try {
    if (!isAdmin(identity)) {
      throw new Error("Access denied: Admin only");
    }

    const tempPassword = generateTempPassword();

    await cognito
      .adminCreateUser({
        UserPoolId: USER_POOL_ID,
        Username: email,
        TemporaryPassword: tempPassword,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: name },
        ],
        // MessageAction: "SUPPRESS",
      })
      .promise();

    console.log("User created successfully in cognito");

    await cognito
      .adminAddUserToGroup({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: role,
      })
      .promise();

    console.log("User added to group successfully");

    const userId = (
      await cognito
        .adminGetUser({
          UserPoolId: USER_POOL_ID,
          Username: email,
        })
        .promise()
    ).Username;

    await ddb
      .put({
        TableName: TABLE_NAME,
        Item: {
          id: userId,
          name,
          email,
          role,
        },
      })
      .promise();

    console.log("User metadata stored successfully in DynamoDB");

    return true;
  } catch (error) {
    console.error("registerUser error:", error);
    throw error;
  }
}

async function listUsers(identity) {
  try {
    if (!isAdmin(identity)) {
      throw new Error("Only admins can access this");
    }

    const result = await ddb.scan({ TableName: TABLE_NAME }).promise();
    return result.Items;
  } catch (error) {
    console.error("listUsers error:", error);
    throw error;
  }
}

async function updateUserRole({ userId, role }, identity) {
  try {
    if (!isAdmin(identity)) {
      throw new Error("Only admins can update roles");
    }

    const userResult = await ddb
      .get({
        TableName: TABLE_NAME,
        Key: { id: userId },
      })
      .promise();

    if (!userResult.Item) {
      throw new Error("User not found");
    }

    const email = userResult.Item.email;
    const oldRole = userResult.Item.role;

    if (oldRole && oldRole !== role) {
      await cognito
        .adminRemoveUserFromGroup({
          UserPoolId: USER_POOL_ID,
          Username: email,
          GroupName: oldRole,
        })
        .promise();
      console.log(`User removed from group ${oldRole}`);
    }

    await cognito
      .adminAddUserToGroup({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: role,
      })
      .promise();
    console.log(`User added to group ${role}`);

    await ddb
      .update({
        TableName: TABLE_NAME,
        Key: { id: userId },
        UpdateExpression: "SET #r = :r",
        ExpressionAttributeNames: { "#r": "role" },
        ExpressionAttributeValues: { ":r": role },
      })
      .promise();

    console.log("User role updated successfully in DynamoDB");

    return true;
  } catch (error) {
    console.error("updateUserRole error:", error);
    throw error;
  }
}

async function me(identity) {
  try {
    const userId = identity.sub;

    const result = await ddb
      .get({
        TableName: TABLE_NAME,
        Key: { id: userId },
      })
      .promise();

    return (
      result.Item || {
        id: userId,
        name: identity.claims.name,
        email: identity.claims.email,
        role: identity.claims["cognito:groups"]?.[0] || "user",
      }
    );
  } catch (error) {
    console.error("me error:", error);
    throw error;
  }
}

function generateTempPassword() {
  const upper = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const lower = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  const number = String.fromCharCode(48 + Math.floor(Math.random() * 10));
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const rest = Array.from({ length: 8 }, () =>
    String.fromCharCode(33 + Math.floor(Math.random() * 94))
  ).join("");

  const all = (upper + lower + number + symbol + rest)
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
  return all.slice(0, 12);
}
