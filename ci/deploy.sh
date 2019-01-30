#!/bin/bash

echo "decrypting credentials..."
mkdir -p ~/.aws
openssl aes-256-cbc -K $encrypted_a11d45259c2e_key -iv $encrypted_a11d45259c2e_iv -in ci/aws-credentials.enc -out ~/.aws/credentials -d
echo "deploying..."
yarn deploy $*
