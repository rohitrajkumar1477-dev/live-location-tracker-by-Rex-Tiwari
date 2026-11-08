/* Firebase config — apni details yahan daalo.
 *
 * Firebase Console (https://console.firebase.google.com) me:
 * 1. Free project banao
 * 2. Build > Realtime Database > Create database (locked mode se start karo,
 *    phir database.rules.json wale rules paste karo)
 * 3. Project settings (gear icon) > "Your apps" > Web app (</>) add karo
 * 4. Wahan se mila config yahan paste karo aur is file ko
 *    `firebase-config.js` naam se save karo.
 *
 * Ye keys browser me dikhti hain — isliye Realtime Database ke RULES
 * (database.rules.json) hi asli security hain, aur Room Code secret rakho.
 */
window.FIREBASE_CONFIG = {
  apiKey: 'PASTE_YOUR_API_KEY_HERE',
  authDomain: 'PASTE_YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL: 'https://PASTE_YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID'
};
