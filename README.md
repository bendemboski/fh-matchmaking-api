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
