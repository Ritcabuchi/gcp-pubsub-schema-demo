import { PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.PROJECT_ID!;
const topicId = process.env.TOPIC_ID!;

interface UserMessage {
  username: string;
  message: string;
  timestamp: number;
}

async function publishMessage(messageData: UserMessage) {
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicId);

  try {
    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    
    const messageId = await topic.publishMessage({
      data: dataBuffer,
    });
    
    console.log(`✅ ส่งข้อความสำเร็จ Message ID: ${messageId}`);
    return messageId;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการส่งข้อความ:', error);
    throw error;
  }
}

async function publishMultipleMessages() {
  const messages: UserMessage[] | any = [
    {
      username: 'alice',
      message: 'สวัสดีครับ!',
      timestamp: Date.now()
    },
    {
      username: 'bob',
      message: 'วันนี้อากาศดีมาก',
      timestamp: Date.now() + 1000
    },
    {
      username: 'charlie',
      message: 'ขอบคุณสำหรับข้อมูลครับ',
      timestamp: Date.now() + 2000
    },
    {
      username: 'charlie',
      message: 'Hello with extra field!',
      timestamp: Date.now(),
      extraField: 'This should not be here', // field เกิน
      anotherExtra: 123, // field เกิน
    }
  ];

  console.log('📤 กำลังส่งข้อความหลายข้อความ...');
  
  for (const message of messages) {
    await publishMessage(message);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

if (require.main === module) {
  publishMultipleMessages()
    .then(() => {
      console.log('🎉 ส่งข้อความทั้งหมดเรียบร้อย');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ เกิดข้อผิดพลาด:', error);
      process.exit(1);
    });
}

export { publishMessage, publishMultipleMessages };
