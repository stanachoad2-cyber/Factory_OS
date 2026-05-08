// ไฟล์: firebase.ts (เปลี่ยนนามสกุลเป็น .ts)
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// 👇👇 Config ของคุณ 👇👇
const firebaseConfig = {
  apiKey: "AIzaSyBMOJIJhxmgXWGSvabQNo_dcGYFJmErdyU",
  authDomain: "daily-check-d2393.firebaseapp.com",
  projectId: "daily-check-d2393",
  storageBucket: "daily-check-d2393.firebasestorage.app",
  messagingSenderId: "588844381774",
  appId: "1:588844381774:web:1def747749f48f4dd1f51f",
};

// 1. Initialize Firebase App
// เช็คก่อนว่ามี App แล้วหรือยัง เพื่อกัน Error "App named [DEFAULT] already exists"
const app = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();

// 2. Initialize Firestore
// การประกาศตัวแปร db ตรงนี้ TypeScript จะรู้ Type โดยอัตโนมัติว่าเป็น firebase.firestore.Firestore
const db = app.firestore();

// 3. Enable Persistence (Optional: ทำงานแบบ Offline ได้)
// ใส่เงื่อนไขเช็ค environment ว่าเป็น browser ถึงจะทำงาน
if (typeof window !== "undefined") {
  db.enablePersistence().catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn(
        "เปิดหลาย Tab เกินไป ปิด Tab อื่นก่อนเพื่อให้ Persistence ทำงาน"
      );
    } else if (err.code === "unimplemented") {
      console.warn("Browser นี้ไม่รองรับ Persistence");
    }
  });
}

console.log("🔥 Firebase Connected Successfully!");

// 4. Export ออกไปใช้
// ไม่ต้องใส่ : any แล้ว เพราะเราประกาศตัวแปรถูกต้องตั้งแต่ต้น
export { db };
export default app;
