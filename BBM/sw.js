// BBM – Service Worker מינימלי, רק כדי שאפשר יהיה להתקין את האתר כאפליקציה.
// לא שומר שום דבר בזיכרון: כל בקשה עוברת לרשת כרגיל, והנתונים תמיד עדכניים.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* מעבר ישיר לרשת */ });
