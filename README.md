# Facing Homelessness Matchmaking API

API server for Facing Homelessness' Block Project website

## Deploying

This is set up to deploy to three stages/environments, `dev`, `stage`, and
`prod`. `dev` is meant to be used for development purposes, `stage` for staging
and acceptance testing, and `prod` for production.

When deploying, it will use an AWS profile called `fh`. If you need to manually
deploy, configure your IAM credentials using the AWS SDK under a profile named
`fh`. Your IAM role must have the necessary permissions to deploy a Serverless
AWS Node.js project.

The travis build auto-deploys to the `stage` environment when a master build
completes successfully. `ci/aws-credentials.enc` is an encrypted AWS
credentials file. The `fh` user in the file must have the necessary permissions
to deploy a Serverless AWS Node.js project.

## Stack creation

When creating a new stack, an initial admin user will be created. However,
there are a couple of manual steps needed. For some reason, I can't get
`UserPoolUserToGroupAttachment` to work with a just-created user, so the new
user needs to be added to the `admins` group:

```
# AWS_PROFILE=fh aws cognito-idp admin-add-user-to-group --region us-west-2 --user-pool-id <user pool id> --username <username> --group-name admins
```

Also, CloudFormation doesn't seem to allow creating users with emails
pre-verified, so the admin user's email should be set to verified:

```
# AWS_PROFILE=fh aws cognito-idp admin-update-user-attributes --region us-west-2 --user-pool-id <user pool id> --username <username> --user-attributes '[{"Name": "email_verified", "Value": "true"}]'
```

`<user pool id>` is in the stack outputs, and you can get `<username>` with
this command:

```
AWS_PROFILE=fh aws cognito-idp admin-get-user --region us-west-2 --user-pool-id <user pool id> --username bendemboski+admin@gmail.com
```

Finally, the user pool email configuration needs to be set up. You need to
specify the user that will be the sender for account creation emails, password
reset emails, etc. Using the AWS console, use SES and the Cognito user pool
to set up a verified from address.
