우리 사이 v9.2 실제 기록 이전

1. 원본 v8.3과 v9.1의 기록 및 앱을 삭제하지 마세요.
2. Firestore Rules에 FIRESTORE-RULES-v9.2-ADD-ONLY.txt의 match 블록만 추가하고 게시하세요. UID 함수는 그대로 둡니다.
3. between-us-cloud 저장소에 이 폴더의 웹 앱 파일(index.html,app.js,cloud.js,sw.js,style.css,manifest.webmanifest,icon 이미지)만 업로드하세요. 개인 IMPORT JSON 파일은 절대 GitHub에 올리지 않습니다.
4. 각 아이폰 홈 화면 Cloud 앱에서 더보기 → 전체 백업 복원(또는 가져오기) → 본인의 v9.2 IMPORT JSON 파일 선택.
5. 가져온 뒤 엄마/딸 각자 포인트 230P, 약속 13건, 신청 1건(딸) 확인.
6. 엄마와 딸 홈 화면에서 Firebase 연결 후 동기화, 양쪽 데이터 비교.
7. 서버 v9.1 테스트 문서는 삭제하지 않고 기존 family-sync-v9-lab에 분리 보관됩니다.
8. 홈 화면 앱을 지우거나 브라우저/사이트 데이터를 삭제하지 마세요. Firebase 인증 UID 유지에 필요합니다.

주의: 불러오기를 여러 번 하면 ID 중복은 피하지만, 삭제한 문서 자동 삭제는 구현되지 않았습니다. 서버에 올리기 전에 양쪽 기록을 확인하세요.
