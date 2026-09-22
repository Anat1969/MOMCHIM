# חדר המומחים (MOMCHIM)

אפליקציה עצמאית לשיחה עם מומחים וירטואליים. היא לא תלויה ב-Base44.

**כתובת האפליקציה:** https://anat1969.github.io/MOMCHIM/

## איך זה עובד

| רכיב | איפה |
|---|---|
| האפליקציה | GitHub Pages. נבנית ומתפרסמת אוטומטית מכל דחיפה לענף `standalone` |
| הנתונים (מומחים, שיחות, מסמכים) | נשמרים בדפדפן (IndexedDB) ומסונכרנים למאגר הפרטי `Anat1969/MOMCHIM-data` |
| תשובות המומחים | Claude API, עם מפתח אישי שנשמר רק בדפדפן |

## הגדרה ראשונה (פעם אחת בכל מכשיר)

במסך **הגדרות** באפליקציה:
1. **מפתח Claude API**: יוצרים אותו ב-https://console.anthropic.com/settings/keys
2. **טוקן גיטהאב**: יוצרים Fine-grained token ב-https://github.com/settings/personal-access-tokens/new
   עם גישה למאגר `MOMCHIM-data` בלבד והרשאת **Contents: Read and write**.

## העברת הנתונים מ-Base44

ב-Base44 מייצאים כל טבלה (Persona, ChatSession, Message, UploadedDocument) לקובץ CSV,
ובאפליקציה בוחרים **הגדרות → ייבוא נתונים**. אפשר לבחור את כל הקבצים יחד.

## פיתוח מקומי

```bash
npm install
npm run dev
```
