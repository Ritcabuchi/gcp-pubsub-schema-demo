# gcp-pubsub-schema-demo

โปรเจกต์นี้แสดงการใช้งาน Google Pub/Sub Schema และการส่งข้อมูลไปยัง Topic ด้วย TypeScript

## ฟีเจอร์หลัก
- สร้าง Pub/Sub Schema (Avro)
- สร้าง Topic พร้อม Schema validation
- ส่งข้อความที่ผ่านการตรวจสอบ Schema

## การติดตั้งและตั้งค่าเริ่มต้น

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Google Cloud Project
1. สร้าง Project ใน [Google Cloud Console](https://console.cloud.google.com/)
2. เปิดใช้งาน Pub/Sub API
3. สร้าง Service Account และดาวน์โหลด JSON key file

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ใน root directory:
```env
PROJECT_ID=your-gcp-project-id
TOPIC_ID=your-topic-name
SCHEMA_ID=your-schema-name
SUBSCRIPTION_ID=your-subscription-name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**ตัวอย่าง:**
```env
PROJECT_ID=my-pubsub-project
TOPIC_ID=user-messages
SCHEMA_ID=user-message-schema
SUBSCRIPTION_ID=user-messages-subscription
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account.json
```

**หมายเหตุ:** หาก `SUBSCRIPTION_ID` ไม่ได้กำหนด ระบบจะสร้างชื่อ subscription อัตโนมัติเป็น `{TOPIC_ID}-subscription`

## คู่มือการใช้งาน

### npm scripts ที่พร้อมใช้งาน
```bash
# รันโปรแกรมหลัก (สร้าง schema, topic และ publish ข้อความ)
npm start

# รัน Publisher เพื่อส่งข้อความ
npm run publisher

# รัน Subscriber เพื่อรับข้อความ
npm run subscriber

```

### การรันโปรแกรม

#### 1. รัน Subscriber (แนะนำให้รันก่อน)
```bash
npm run subscriber
```
Subscriber จะ:
- สร้าง subscription หากยังไม่มี
- รอรับข้อความจาก topic
- แสดงข้อความที่ได้รับพร้อมการตรวจสอบ schema
- ทำ message acknowledgment

#### 2. รัน Publisher (รันใน terminal อีกหน้าต่าง)
```bash
npm run publisher
```
Publisher จะ:
- ส่งข้อความตัวอย่างหลายชนิด
- ทดสอบการส่งข้อความที่ถูกต้องและผิดรูปแบบ
- แสดงผลลัพธ์การส่งข้อความ

#### 3. รันโปรแกรมหลัก (สำหรับ setup เริ่มต้น)
```bash
npm start
```

### สิ่งที่โปรแกรมจะทำ:

#### โปรแกรมหลัก (`npm start`)

##### 1. สร้าง Schema (Avro Format)
โปรแกรมจะสร้าง Schema ด้วยโครงสร้างข้อมูล:
```json
{
  "type": "record",
  "name": "UserMessage",
  "fields": [
    { "name": "username", "type": "string" },
    { "name": "message", "type": "string" },
    { "name": "timestamp", "type": "long" }
  ]
}
```

##### 2. สร้าง Topic พร้อม Schema Validation
- Topic จะถูกสร้างพร้อมการผูก Schema
- ข้อความที่ส่งไป Topic จะต้องผ่านการตรวจสอบตาม Schema
- ใช้ JSON encoding

##### 3. ส่งข้อความทดสอบ
ส่งข้อความตัวอย่าง:
```json
{
  "username": "alice",
  "message": "Hello, world!",
  "timestamp": 1726567890000
}
```

#### Publisher (`npm run publisher`)
- ส่งข้อความหลายแบบเพื่อทดสอบ schema validation
- ทดสอบข้อความที่ถูกต้อง, ผิดรูปแบบ และมี field เพิ่มเติม
- แสดงผลลัพธ์การส่งแต่ละข้อความ

#### Subscriber (`npm run subscriber`)
- สร้าง subscription อัตโนมัติหากยังไม่มี
- รับข้อความจาก topic แบบ real-time
- ตรวจสอบและประมวลผลข้อความที่ได้รับ
- ทำ message acknowledgment เพื่อยืนยันการประมวลผล
- แสดง delivery attempt และ message attributes

#### การทดสอบ Schema (`npm run test-schema`)
- ทดสอบการส่งข้อความที่มี schema violation
- ทดสอบข้อความที่มี extra fields
- ทดสอบข้อความที่ขาด required fields
- แสดงผลการตรวจสอบ schema validation

## วิธีการทำงานของระบบ

### Flow การทำงานแบบ Publisher-Subscriber

```
1. [Schema] → สร้าง Schema definition
2. [Topic] → สร้าง Topic พร้อม bind Schema
3. [Subscription] → สร้าง Subscription สำหรับ Topic
4. [Publisher] → ส่งข้อความไป Topic
5. [Schema Validation] → ตรวจสอบข้อความตาม Schema
6. [Subscriber] → รับข้อความจาก Subscription
7. [Processing] → ประมวลผลข้อความ
8. [Acknowledgment] → ยืนยันการประมวลผลเสร็จ
```

### ความสัมพันธ์ระหว่าง Topic และ Subscription

- **Topic**: จุดรับส่งข้อความ (มี Schema validation)
- **Subscription**: ช่องทางสำหรับ Subscriber ดึงข้อความจาก Topic
- **หนึ่ง Topic** สามารถมี **หลาย Subscriptions** ได้
- **แต่ละ Subscription** จะได้รับข้อความ**ทุกข้อความ**ที่ส่งมาใหม่
- **Message Acknowledgment**: Subscriber ต้องยืนยันการประมวลผลเสร็จแล้ว

## การปรับแต่ง Schema

### แก้ไข Schema Definition
แก้ไขใน `src/index.ts`:
```typescript
const schemaDefinition = `{
  "type": "record",
  "name": "YourMessageType",
  "fields": [
    // เพิ่ม field ใหม่ที่นี่
    { "name": "fieldName", "type": "string" },
    { "name": "optionalField", "type": ["null", "string"], "default": null }
  ]
}`;
```

### ประเภทข้อมูล Avro ที่รองรับ:
- `string` - ข้อความ
- `int` - จำนวนเต็ม 32 bit
- `long` - จำนวนเต็ม 64 bit
- `float` - จำนวนทศนิยม
- `boolean` - true/false
- `["null", "type"]` - Optional field

## Schema Validation และ JSON Encoding

### วิธีการทำงานของ Schema Validation

เมื่อใช้ **JSON Encoding** กับ **Avro Schema** ใน Google Pub/Sub จะมีพิฤติกรรมดังนี้:

#### ✅ สิ่งที่ไม่ทำให้เกิด Error:
1. **Field พิเศษ (Extra Fields)** - จะถูกละเว้น
   ```json
   // Schema: username, message, timestamp
   // Message นี้จะผ่าน - field "extra" จะถูกละเว้น
   {
     "username": "alice",
     "message": "Hello",
     "timestamp": 1726567890000,
     "extra": "this will be ignored"  // ← ถูกละเว้น
   }
   ```

2. **Field ที่เป็น Optional** - สามารถไม่ส่งได้ถ้า Schema อนุญาต

#### ❌ สิ่งที่ทำให้เกิด Error:
1. **Field ที่จำเป็นหายไป (Missing Required Fields)**
   ```json
   // Error: ขาด "message" field
   {
     "username": "alice",
     "timestamp": 1726567890000
   }
   ```

2. **ประเภทข้อมูลผิด (Wrong Data Type)**
   ```json
   // Error: timestamp ต้องเป็น number ไม่ใช่ string
   {
     "username": "alice",
     "message": "Hello",
     "timestamp": "not-a-number"  // ← ผิดประเภท
   }
   ```

3. **ข้อมูลไม่ใช่ Valid JSON**
   ```json
   // Error: JSON ไม่ถูกต้อง
   { username: "alice" }  // ← ขาด quotes
   ```

### ทำความเข้าใจ Avro Field Resolution

Avro ใช้หลักการ **"Writer's Schema"** vs **"Reader's Schema"**:
- **Writer's Schema**: Schema ที่ใช้เวลาเขียน/ส่งข้อมูล
- **Reader's Schema**: Schema ที่ใช้เวลาอ่านข้อมูล
- Field ที่ไม่รู้จักจะถูกละเว้น เพื่อให้ Schema สามารถพัฒนาต่อได้

### ตัวอย่างการทดสอบ Schema Validation

#### ทดสอบ Extra Fields (จะผ่าน):
```typescript
const messageWithExtra = {
  username: 'alice',
  message: 'Hello, world!',
  timestamp: Date.now(),
  extraField: 'will be ignored',  // ← จะถูกละเว้น
  anotherExtra: 123              // ← จะถูกละเว้นเช่นกัน
};
```

#### ทดสอบ Missing Field (จะ Error):
```typescript
const messageWithMissing = {
  username: 'alice',
  // message: 'Hello, world!',  // ← ขาด field นี้จะ error
  timestamp: Date.now(),
};
```

#### ทดสอบ Wrong Type (จะ Error):
```typescript
const messageWithWrongType = {
  username: 'alice',
  message: 'Hello, world!',
  timestamp: 'not-a-number',  // ← ผิดประเภทจะ error
};
```

## การจัดการข้อผิดพลาด

### ข้อผิดพลาดที่อาจเจอ:

1. **Schema already exists**: Schema มีอยู่แล้ว (ปกติ)
2. **Topic already exists**: Topic มีอยู่แล้ว (ปกติ)
3. **Authentication error**: ตรวจสอบ Service Account และ credentials
4. **Schema validation failed**: ข้อความไม่ตรงกับ Schema
   - ตรวจสอบ required fields
   - ตรวจสอบประเภทข้อมูล
   - ตรวจสอบ JSON format

### วิธีแก้ไข:
- ตรวจสอบ `.env` file
- ยืนยันว่า Service Account มีสิทธิ์ Pub/Sub Editor
- ตรวจสอบโครงสร้างข้อความให้ตรงกับ Schema
- ใช้ JSON validator เพื่อตรวจสอบ JSON format
- Log ข้อความก่อนส่งเพื่อ debug

## การทดสอบและ Debug

### ดู Schema ที่สร้างแล้ว:
```bash
gcloud pubsub schemas list --project=YOUR_PROJECT_ID
```

### ดู Topic ที่สร้างแล้ว:
```bash
gcloud pubsub topics list --project=YOUR_PROJECT_ID
```

### ดู Subscription ที่สร้างแล้ว:
```bash
gcloud pubsub subscriptions list --project=YOUR_PROJECT_ID
```

### ทดสอบส่งข้อความ:
```bash
gcloud pubsub topics publish YOUR_TOPIC_ID --message='{"username":"test","message":"hello","timestamp":1234567890}'
```

### ดึงข้อความจาก Subscription:
```bash
gcloud pubsub subscriptions pull YOUR_SUBSCRIPTION_ID --limit=5
```

## เพิ่มเติม

### การใช้ในสภาพแวดล้อม Production:
1. ใช้ Workload Identity แทน Service Account key file
2. ตั้งค่า Error handling และ retry logic
3. เพิ่ม Monitoring และ Logging
4. ใช้ Dead Letter Topic สำหรับข้อความที่ล้มเหลว
5. ตั้งค่า Message retention และ Acknowledgment deadline
6. ใช้ Subscription filtering เพื่อกรองข้อความ

### การพัฒนาต่อ:
- เพิ่ม Dead Letter Policy สำหรับการจัดการข้อผิดพลาด
- ใช้ Schema evolution สำหรับการอัพเดท Schema
- เพิ่ม Batch publishing สำหรับประสิทธิภาพ
- ตั้งค่า Exactly-once delivery สำหรับความน่าเชื่อถือ
- เพิ่ม Custom validation logic ใน Subscriber
- ใช้ Message ordering สำหรับข้อความที่ต้องเรียงลำดับ

## ไฟล์สำคัญในโปรเจกต์

```
pubsub-schema-test/
├── src/
│   ├── index.ts              # โปรแกรมหลัก (setup schema และ topic)
│   ├── publisher.ts          # ส่งข้อความ
│   ├── subscriber.ts         # รับข้อความ
│   └── test-schema-validation.ts  # ทดสอบ schema validation
├── package.json              # npm scripts และ dependencies
├── tsconfig.json            # TypeScript configuration
├── .env                     # Environment variables (ต้องสร้างเอง)
└── README.md               # คู่มือการใช้งาน
```
