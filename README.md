# Camera Toon

스마트폰 카메라 위에 종이 장난감 카메라를 띄우고, 촬영한 결과의 프레임 안쪽만 펜선과 색연필로 그린 듯 바꾸는 모바일 웹앱입니다.

**웹앱 실행:** https://space-youthcenter.github.io/camera-toon/

## 특징

- 앱을 열면 카메라 권한을 요청하고 실시간 미리보기를 시작합니다.
- 촬영 전에는 필터 없는 일반 카메라 미리보기를 표시합니다.
- 촬영한 결과에서만 종이 카메라 안쪽에 펜선·색연필 스케치 효과가 적용됩니다.
- 촬영한 전체 장면을 하나의 PNG 이미지로 저장할 수 있습니다.
- 영상과 사진은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.
- 별도의 설치나 빌드 과정이 필요 없습니다.
- iPhone Safari를 포함한 모바일 화면에 맞춰져 있습니다.
- `assets/frame-camera.png`가 없으면 임시 종이 카메라 프레임을 자동으로 그립니다.

## GitHub Pages 배포

이 저장소의 `main` 브랜치에 파일을 올리면 GitHub Actions가 자동으로 배포합니다.

처음 한 번 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택해 주세요.

배포 주소 형식은 다음과 같습니다.

`https://GITHUB-USERNAME.github.io/camera-toon/`

## 실제 카메라 프레임 사용

투명 PNG 프레임을 `assets/frame-camera.png`에 넣으세요. 화면 구멍의 위치가 다르면 `script.js`의 `getScreenRect()` 비율을 조정하면 됩니다.
