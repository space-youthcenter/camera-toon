# Camera Toon

스마트폰 카메라 위에 종이 장난감 카메라를 띄우고, 촬영한 결과의 프레임 안쪽만 펜선과 색연필로 그린 듯 바꾸는 모바일 웹앱입니다.

**웹앱 실행:** https://space-youthcenter.github.io/camera-toon/

## 특징

- 앱을 열면 카메라 권한을 요청하고 실시간 미리보기를 시작합니다.
- 촬영 전에는 필터 없는 일반 카메라 미리보기를 표시합니다.
- 촬영한 결과에서만 종이 카메라 안쪽에 펜선·색연필 스케치 효과가 적용됩니다.
- 촬영한 전체 장면을 하나의 PNG 이미지로 저장할 수 있습니다.
- 미리보기 영상은 전송되지 않으며, 촬영 시 내부 화면 crop만 AI 변환을 위해 전송됩니다.
- 별도의 빌드 과정이 필요 없습니다.
- iPhone Safari를 포함한 모바일 화면에 맞춰져 있습니다.
- `assets/frame-camera.png`가 없으면 임시 종이 카메라 프레임을 자동으로 그립니다.

## AI 변환 구조

촬영된 전체 사진이 아니라 종이 카메라의 내부 화면 영역만 잘라 Netlify Function으로 전송합니다. 함수는 서버 환경 변수의 OpenAI API 키를 사용해 `gpt-image-2` 이미지 편집 API를 호출합니다. 변환 결과는 원본 사진의 같은 위치에 다시 합성되며, 호출이 실패하면 브라우저의 Paper Toon 캔버스 효과가 자동으로 사용됩니다.

API 키는 브라우저 코드나 GitHub 저장소에 넣지 않습니다.

## Netlify 배포

1. 이 GitHub 저장소를 Netlify의 **Import an existing project**로 연결합니다.
2. Build command는 비워 두고 Publish directory는 `.`을 사용합니다.
3. Netlify의 **Environment variables**에 `OPENAI_API_KEY`를 추가합니다.
4. 선택적으로 `OPENAI_IMAGE_MODEL=gpt-image-2`를 추가합니다.
5. 배포 후 `/api/transform` 요청은 `netlify/functions/transform-image.mjs`에서 처리됩니다.

GitHub Pages에서는 서버리스 함수를 실행할 수 없으므로 AI 호출 대신 기존 캔버스 fallback이 사용됩니다.

## GitHub Pages 배포

이 저장소의 `main` 브랜치에 파일을 올리면 GitHub Actions가 자동으로 배포합니다.

처음 한 번 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택해 주세요.

배포 주소 형식은 다음과 같습니다.

`https://GITHUB-USERNAME.github.io/camera-toon/`

## 실제 카메라 프레임 사용

투명 PNG 프레임을 `assets/frame-camera.png`에 넣으세요. 화면 구멍의 위치가 다르면 `script.js`의 `getScreenRect()` 비율을 조정하면 됩니다.
