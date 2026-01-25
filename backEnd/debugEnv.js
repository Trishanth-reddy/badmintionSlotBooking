require('dotenv').config();
const nodemailer = require('nodemailer');

console.log("\n🔍 DEBUGGING CREDENTIALS 🔍");
console.log("--------------------------------");

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

console.log(`1. SMTP_USER:   '${user}'`); // Quotes help spot spaces
console.log(`2. SMTP_PASS:   '${pass ? pass.substring(0, 5) + '...' + pass.substring(pass.length - 3) : 'UNDEFINED'}'`);

if (!user || !pass) {
    console.error("❌ CRITICAL ERROR: Variables are missing from .env file!");
    process.exit(1);
}

if (user.trim() !== user) console.error("⚠️ WARNING: Your SMTP_USER has extra spaces!");
if (pass.trim() !== pass) console.error("⚠️ WARNING: Your SMTP_PASS has extra spaces!");

console.log("--------------------------------");
console.log("3. Attempting Connection...");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user, pass },
});

transporter.verify((error, success) => {
    if (error) {
        console.error("\n❌ CONNECTION FAILED:");
        console.error(error.message);
        if (error.response && error.response.includes('535')) {
            console.log("\n💡 DIAGNOSIS: The server rejected the key.");
            console.log("   1. Did you accidentally copy the API Key instead of the SMTP Key?");
            console.log("   2. Are you using the correct Login Email as the User?");
        }
    } else {
        console.log("\n✅ SUCCESS! Credentials work.");
    }
});