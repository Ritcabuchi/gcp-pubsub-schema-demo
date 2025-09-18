import { Message, PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.PROJECT_ID!;
const topicId = process.env.TOPIC_ID!;
const subscriptionId = process.env.SUBSCRIPTION_ID || `${topicId}-subscription`;

interface UserMessage {
  username: string;
  message: string;
  timestamp: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateMessageSchema(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.username || typeof data.username !== 'string') {
    errors.push('Field "username" is required and must be string');
  }
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Field "message" is required and must be string');
  }
  if (!data.timestamp || typeof data.timestamp !== 'number') {
    errors.push('Field "timestamp" is required and must be number');
  }
  
  const allowedFields = ['username', 'message', 'timestamp'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`Extra fields found: ${extraFields.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function createSubscription() {
  const pubsub = new PubSub({ projectId });
  
  try {
    // ตรวจสอบว่า subscription มีอยู่แล้วหรือไม่
    const [subscriptions] = await pubsub.getSubscriptions();
    const subscriptionExists = subscriptions.some(sub => 
      sub.name.endsWith(subscriptionId)
    );

    if (!subscriptionExists) {
      // สร้าง subscription ใหม่
      const [subscription] = await pubsub
        .topic(topicId)
        .createSubscription(subscriptionId, {
          // กำหนดการตั้งค่าต่างๆ
          ackDeadlineSeconds: 60, // เวลาในการ acknowledge
          messageRetentionDuration: {
            seconds: 86400, // เก็บข้อความไว้ 1 วัน
          },
          enableMessageOrdering: false,
          // กำหนด dead letter policy (ถ้าต้องการ)
          deadLetterPolicy: {
            deadLetterTopic: `projects/${projectId}/topics/${topicId}-dead-letter`,
            maxDeliveryAttempts: 5
          }
        });
      
      console.log(`✅ Subscription ${subscriptionId} created successfully.`);
      return subscription;
    } else {
      console.log(`✅ Subscription ${subscriptionId} already exists.`);
      return pubsub.subscription(subscriptionId);
    }
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    throw error;
  }
}

function createMessageHandler() {
  return (message: Message) => {
    try {
      // แปลงข้อมูลจาก Buffer เป็น JSON
      const rawData = JSON.parse(message.data.toString());
      
      console.log('\n📨 ได้รับข้อความใหม่:');
      console.log(`   🆔 Message ID: ${message.id}`);
      console.log(`   📊 Attributes:`, message.attributes);
      console.log(`   � Raw Data:`, rawData);
      
      const validationResult = validateMessageSchema(rawData);
      console.log(`   ✅ Schema Valid: ${validationResult.isValid}`);
      if (!validationResult.isValid) {
        console.log(`   ⚠️  Schema Errors:`, validationResult.errors);
      }
      
      message.ack();
      console.log(`✅ ประมวลผลข้อความ ${message.id} เรียบร้อย`);
        
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอ่านข้อความ:', error);
      message.nack();
    }
  };
}


function createErrorHandler() {
  return (error: Error) => {
    console.error('❌ เกิดข้อผิดพลาดในการรับข้อความ:', error);
  };
}

async function startSubscription() {
  try {
    console.log('🚀 เริ่มต้น Pub/Sub Subscriber...');
    
    // สร้าง subscription
    const subscription = await createSubscription();
    
    // ตั้งค่า message handler
    const messageHandler = createMessageHandler();
    const errorHandler = createErrorHandler();
    
    
    // เริ่มรับข้อความ
    subscription.on('message', messageHandler);
    subscription.on('error', errorHandler);
    
    console.log(`👂 กำลังฟังข้อความจาก subscription: ${subscriptionId}`);
    console.log('📱 กด Ctrl+C เพื่อหยุดการทำงาน\n');
    
    // จัดการการปิดโปรแกรมอย่างสวยงาม
    process.on('SIGINT', async () => {
      console.log('\n⏹️  กำลังหยุดการทำงาน...');
      await subscription.close();
      console.log('✅ หยุดการทำงานเรียบร้อย');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเริ่มต้น subscriber:', error);
    process.exit(1);
  }
}

// เรียกใช้เมื่อไฟล์นี้ถูกรันโดยตรง
if (require.main === module) {
  startSubscription();
}

export { createSubscription, startSubscription };
