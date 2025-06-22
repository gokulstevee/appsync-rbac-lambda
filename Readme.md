# AWS AppSync Cognito Lambda Functions

This Lambda function provides user management for an AWS AppSync GraphQL API using AWS Cognito and DynamoDB.

## Features

- **Register User**: Admins can register new users. A secure temporary password is generated and Cognito sends an invitation email.
- **List Users**: Admins can list all users from DynamoDB, with pagination.
- **Update User Role**: Admins can change a user's role. The user is moved between Cognito groups and the role is updated in DynamoDB.
- **Me**: Returns the current user's profile.

## Environment Variables

- `TABLE_NAME`: DynamoDB table for user metadata.
- `USER_POOL_ID`: Cognito User Pool ID.

## GraphQL Schema

```graphql
type PaginatedUsers {
  users: [User]
  nextToken: String
}

type User {
  id: ID!
  name: String!
  email: String!
  role: String!
}

type Mutation {
  registerUser(name: String!, email: String!, role: String!): Boolean
    @aws_auth(cognito_groups: ["admin"])
  updateUserRole(userId: ID!, role: String!): Boolean
    @aws_auth(cognito_groups: ["admin"])
}

type Query {
  me: User
  listUsers(limit: Int, nextToken: String): PaginatedUsers
    @aws_auth(cognito_groups: ["admin"])
}
```

## GraphQL Field Mapping

| Field Name     | Description                       |
| -------------- | --------------------------------- |
| registerUser   | Register a new user (admin)       |
| listUsers      | List all users (admin, paginated) |
| updateUserRole | Change a user's role (admin)      |
| me             | Get current user info             |

## Security

- Only users in the `admin` Cognito group can register users, list users, or update roles.
- Temporary passwords are randomly generated and sent to the respective users via email.

---
