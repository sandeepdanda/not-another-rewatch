#!/bin/bash
# Creates DynamoDB tables in LocalStack on startup

ENDPOINT="http://localhost:4566"
REGION="us-west-2"

echo "Creating MovieCatalog table..."
awslocal dynamodb create-table \
  --table-name MovieCatalog \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "GSI1-EntityLookup",
        "KeySchema": [
          {"AttributeName": "GSI1PK", "KeyType": "HASH"},
          {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
        ],
        "Projection": {
          "ProjectionType": "INCLUDE",
          "NonKeyAttributes": ["title", "releaseYear", "voteAvg", "popularity", "posterUrl"]
        }
      },
      {
        "IndexName": "GSI2-RatingSort",
        "KeySchema": [
          {"AttributeName": "GSI2PK", "KeyType": "HASH"},
          {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
        ],
        "Projection": {
          "ProjectionType": "INCLUDE",
          "NonKeyAttributes": ["title", "releaseYear", "voteAvg", "popularity", "posterUrl"]
        }
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Creating UserActivity table..."
awslocal dynamodb create-table \
  --table-name UserActivity \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI3PK,AttributeType=S \
    AttributeName=GSI3SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "GSI3-EmailLookup",
        "KeySchema": [
          {"AttributeName": "GSI3PK", "KeyType": "HASH"},
          {"AttributeName": "GSI3SK", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "KEYS_ONLY"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Tables created:"
awslocal dynamodb list-tables --region $REGION
