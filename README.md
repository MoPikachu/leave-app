# أجازات الفريق

صفحة ثابتة (HTML + JS) بتشتغل على Vercel، والبيانات وتسجيل الدخول على Firebase (Firestore + Google Sign-in).

## الملفات
| الملف | وظيفته |
|---|---|
| `index.html` | التطبيق نفسه |
| `claude-shim.js` | بيوصل التطبيق بـ Firebase (تسجيل الدخول + قاعدة البيانات + تنزيل CSV) |
| `firebase-config.js` | **عدّله**: إعدادات Firebase + إيميلات المسؤولين |
| `firestore.rules` | **عدّله**: صلاحيات قاعدة البيانات (حط نفس إيميلات المسؤولين) |

## 1) Firebase
1. ادخل https://console.firebase.google.com واعمل Project جديد.
2. **Build > Authentication > Get started > Sign-in method > Google > Enable**.
3. **Build > Firestore Database > Create database** (Production mode، وأقرب Location).
4. **Firestore > Rules**: الصق محتوى `firestore.rules` بعد ما تغيّر `admin@example.com` لإيميلك (بحروف صغيرة)، واضغط **Publish**.
5. **Project settings > General > Your apps > Web (</>)**: سجّل App وانسخ الـ `firebaseConfig` في `firebase-config.js`، وحط إيميلك في `ADMIN_EMAILS`.

## 2) GitHub
```bash
git init
git add .
git commit -m "Leave app"
git branch -M main
git remote add origin https://github.com/USERNAME/leave-app.git
git push -u origin main
```
(أو من موقع GitHub: New repository ثم Upload files واسحب الملفات.)

## 3) Vercel
1. https://vercel.com > **Add New > Project** > اختار الـ repo.
2. Framework Preset: **Other**، من غير Build Command. اضغط **Deploy**.
3. بعد ما يطلع الرابط (مثلاً `leave-app.vercel.app`): ارجع Firebase > **Authentication > Settings > Authorized domains > Add domain** وضيف الدومين ده.

## الاستخدام
- المسؤول (إيميله في القايمة) بيشوف كل حاجة: الأرصدة، الطلبات، التسجيل، السجل.
- أي موظف يسجل دخول بجوجل مرة، وبعدها المسؤول يربطه من درج الموظف («ربط بحساب»)، فيقدر يطلب أجازات ويشوف رصيده.
- المدير (المرحلة التانية للموافقة) بيتحدد من صفحة الطلبات.

> ملاحظة: البيانات القديمة اللي على claude.ai مش بتتنقل لوحدها. نزّل CSV من الصفحة القديمة لو محتاج ترجعلها، وضيف الموظفين من جديد هنا.
