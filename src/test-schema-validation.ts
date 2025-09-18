import { PubSub, v1 } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.PROJECT_ID!;
const topicId = process.env.TOPIC_ID!;

async function testSchemaValidation() {
  const pubsub = new PubSub({ projectId });
  const topicPath = pubsub.topic(topicId);

  console.log('\n=== Testing Schema Validation ===\n');

  // Test 1: Extra field (should succeed - fields ignored)
  console.log('1. Testing message with extra field:');
  try {
    const messageWithExtra = {
      username: 'alice',
      message: 'Hello, world!',
      mmm: 'oops', // Extra field not in schema
      timestamp: Date.now(),
    };
    const dataBuffer1 = Buffer.from(JSON.stringify(messageWithExtra));
    const messageId1 = await topicPath.publishMessage({ data: dataBuffer1 });
    console.log(`✅ Success: Message published with ID ${messageId1}`);
    console.log('   Extra fields are ignored with JSON encoding\n');
  } catch (error) {
    console.log(`❌ Error: ${error}\n`);
  }

  // Test 2: Missing required field (should fail)
  console.log('2. Testing message with missing required field:');
  try {
    const messageWithMissing = {
      username: 'bob',
      // message: missing!
      timestamp: Date.now(),
    };
    const dataBuffer2 = Buffer.from(JSON.stringify(messageWithMissing));
    const messageId2 = await topicPath.publishMessage({ data: dataBuffer2 });
    console.log(`✅ Unexpected success: Message published with ID ${messageId2}`);
  } catch (error) {
    console.log(`❌ Expected error: ${error}\n`);
  }

  // Test 3: Wrong data type (should fail)
  console.log('3. Testing message with wrong data type:');
  try {
    const messageWithWrongType = {
      username: 'charlie',
      message: 'Hello!',
      timestamp: 'not-a-number', // Should be a number
    };
    const dataBuffer3 = Buffer.from(JSON.stringify(messageWithWrongType));
    const messageId3 = await topicPath.publishMessage({ data: dataBuffer3 });
    console.log(`✅ Unexpected success: Message published with ID ${messageId3}`);
  } catch (error) {
    console.log(`❌ Expected error: ${error}\n`);
  }

  // Test 4: Completely invalid JSON structure
  console.log('4. Testing completely invalid structure:');
  try {
    const invalidMessage = "just a string, not an object";
    const dataBuffer4 = Buffer.from(JSON.stringify(invalidMessage));
    const messageId4 = await topicPath.publishMessage({ data: dataBuffer4 });
    console.log(`✅ Unexpected success: Message published with ID ${messageId4}`);
  } catch (error) {
    console.log(`❌ Expected error: ${error}\n`);
  }
}

testSchemaValidation().catch(console.error);