# pubsub-schema-test

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
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**ตัวอย่าง:**
```env
PROJECT_ID=my-pubsub-project
TOPIC_ID=user-messages
SCHEMA_ID=user-message-schema
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account.json
```

## คู่มือการใช้งาน

### การรันโปรแกรม
```bash
npm start
```

### สิ่งที่โปรแกรมจะทำ:

#### 1. สร้าง Schema (Avro Format)
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

#### 2. สร้าง Topic พร้อม Schema Validation
- Topic จะถูกสร้างพร้อมการผูก Schema
- ข้อความที่ส่งไป Topic จะต้องผ่านการตรวจสอบตาม Schema
- ใช้ JSON encoding

#### 3. ส่งข้อความทดสอบ
ส่งข้อความตัวอย่าง:
```json
{
  "username": "alice",
  "message": "Hello, world!",
  "timestamp": 1726567890000
}
```

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

### ทดสอบส่งข้อความ:
```bash
gcloud pubsub topics publish YOUR_TOPIC_ID --message='{"username":"test","message":"hello","timestamp":1234567890}'
```

## เพิ่มเติม

### การใช้ในสภาพแวดล้อม Production:
1. ใช้ Workload Identity แทน Service Account key file
2. ตั้งค่า Error handling และ retry logic
3. เพิ่ม Monitoring และ Logging
4. ใช้ Dead Letter Topic สำหรับข้อความที่ล้มเหลว

### การพัฒนาต่อ:
- เพิ่ม Subscriber เพื่อรับข้อความ
- ใช้ Schema evolution สำหรับการอัพเดท Schema
- เพิ่ม Batch publishing สำหรับประสิทธิภาพ
