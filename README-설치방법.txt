우리 사이 v9: 수동 서버 동기화 검증판

이 테스트판은 기존 v8.3의 감정·약속·상벌점 데이터를 전혀 읽거나 전송하지 않습니다.
기존 between-us 저장소를 덮어쓰지 마세요. 반드시 새로운 별도 저장소(예: between-us-v9-test)로 배포하세요.

1. Firebase 콘솔 https://console.firebase.google.com 에 Google 계정으로 로그인해 새 프로젝트를 생성합니다.
2. 프로젝트에서 웹 앱(</>)을 등록한 뒤 웹 설정의 apiKey, authDomain, projectId, appId 값을 복사합니다.
3. Authentication > Sign-in method에서 Anonymous(익명)를 활성화합니다.
4. Firestore Database를 생성합니다. 프로덕션 모드를 선택하고 테스트의 보안 규칙을 명시적으로 배포합니다.
5. 새 GitHub 저장소(예: between-us-v9-test)를 만들고 이 ZIP의 index.html, app.js, style.css, manifest.webmanifest, icon-180/192/512.png를 최상위에 업로드합니다.
6. Settings > Pages에서 main/(root) GitHub Pages 배포를 켭니다.
7. 엄마와 딸의 아이폰에서 각각 새 v9 주소를 열고 Firebase 설정 JSON을 붙여넣고 'Firebase 연결'을 눌러 각자의 익명 UID를 확인합니다.
8. firestore.rules 파일에서 PASTE_MOM_UID_HERE와 PASTE_DAUGHTER_UID_HERE를 두 UID로 교체해 Firebase Firestore > Rules에 붙여넣고 Publish 합니다.
9. 엄마와 딸이 각각 테스트 메모를 입력하고 '이 기기에 메모 저장'을 누릅니다.
10. 엄마가 서버와 동기화를 누른 다음, 딸도 서버와 동기화를 누릅니다. 딸 쪽에 엄마 메모가 보이는지 확인합니다. 딸이 새 메모를 저장해 동기화한 후 엄마가 다시 동기화해 확인합니다.

주의
- 기존 앱과 혼동하지 않도록 반드시 별도 GitHub Pages 저장소를 사용합니다.
- Firebase 설정 객체(apiKey 등)는 일반적으로 공개 웹 앱 구성 정보입니다. 그러나 익명 인증 UID와 허가 목록, 강한 Firestore 규칙으로 데이터 접근을 제한해야 합니다.
- 가족 전용 테스트용이며 엄마/딸 역할 선택은 UI 표현일 뿐 보안상 역할 인증이 아닙니다.
- 데이터 변경은 '메모 추가'만 지원하며 수정/삭제/동시 편집은 테스트 범위에 없습니다.
- 무료 사용량은 Firebase 요금제 및 정책에 따릅니다.
- iOS Safari와 홈 화면 추가 앱은 인증 ID가 다를 수 있습니다. 각각 별도 기기로 간주하므로 우선 Safari에서 검증하세요.
- 아이폰 Safari 사이트 데이터 삭제나 비공개 브라우징으로 인증 ID가 바뀌면 규칙에서 UID를 갱신해야 합니다.
- 브라우저 CDN 로딩, Firebase 설정, 인증, Firestore 규칙은 실제 Firebase 프로젝트가 있어야 검증 가능합니다.
