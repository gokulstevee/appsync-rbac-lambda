# AWS AppSync Cognito Lambda Functions

This Lambda function provides user management for an AWS AppSync GraphQL API using AWS Cognito and DynamoDB.

## Features

- **Register User**: Admins can register new users. A secure temporary password is generated and Cognito sends an invitation email.
- **List Users**: Admins can list all users from DynamoDB.
- **Update User Role**: Admins can change a user's role. The user is moved between Cognito groups and the role is updated in DynamoDB.
- **Me**: Returns the current user's profile.

## Environment Variables

- `TABLE_NAME`: DynamoDB table for user metadata.
- `USER_POOL_ID`: Cognito User Pool ID.

## GraphQL Field Mapping

| Field Name     | Description                  |
| -------------- | ---------------------------- |
| registerUser   | Register a new user (admin)  |
| listUsers      | List all users (admin)       |
| updateUserRole | Change a user's role (admin) |
| me             | Get current user info        |

## Security

- Only users in the `admin` Cognito group can register users, list users, or update roles.
- Temporary passwords are randomly generated and sent to the respective users via email.
