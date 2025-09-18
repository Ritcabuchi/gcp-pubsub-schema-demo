import { PubSub, v1 } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.PROJECT_ID!;
const topicId = process.env.TOPIC_ID!;
const schemaId = process.env.SCHEMA_ID!;

const schemaDefinition = `{
  "type": "record",
  "name": "UserMessage",
  "fields": [
    { "name": "username", "type": "string" },
    { "name": "message", "type": "string" },
    { "name": "timestamp", "type": "long" }
  ]
}`;

async function main() {
  const pubsub = new PubSub({ projectId });
  const schemaClient = new v1.SchemaServiceClient();

  // 1. Create Schema (if not exists)
  const schemaPath = schemaClient.schemaPath(projectId, schemaId);
  try {
    await schemaClient.getSchema({ name: schemaPath });
    console.log(`Schema ${schemaId} already exists.`);
  } catch {
    await schemaClient.createSchema({
      parent: `projects/${projectId}`,
      schemaId,
      schema: {
        type: 'AVRO',
        definition: schemaDefinition,
      },
    });
    console.log(`Schema ${schemaId} created.`);
  }

  // 2. Create Topic with Schema (if not exists)
  const topicPath = pubsub.topic(topicId);
  const [topics] = await pubsub.getTopics();
  const topicExists = topics.some(t => t.name.endsWith(topicId));
  if (!topicExists) {
    await pubsub.createTopic({
      name: topicId,
      schemaSettings: {
        schema: schemaPath,
        encoding: 'JSON',
      },
    });
    console.log(`Topic ${topicId} created with schema.`);
  } else {
    console.log(`Topic ${topicId} already exists.`);
  }

  // 3. Publish message conforming to schema
  const message = {
    username: 'alice',
    message: 'Hello, world!',
    timestamp: Date.now(),
  };
  const dataBuffer = Buffer.from(JSON.stringify(message));
  const messageId = await topicPath.publishMessage({ data: dataBuffer });
  console.log(`Message published: ${messageId}`);
}

main().catch(console.error);
