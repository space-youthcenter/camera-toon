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

> **배포 환경에 따른 차이**
>
> - **GitHub Pages:** Netlify Functions를 실행할 수 없으므로 OpenAI AI 변환은 작동하지 않습니다. 카메라·촬영·저장과 브라우저 캔버스 fallback 확인용입니다.
> - **Netlify:** `/api/transform` 요청이 Netlify Function으로 연결되므로 `OPENAI_API_KEY`가 설정되어 있으면 OpenAI AI 변환이 작동합니다.

## Netlify 배포

1. 이 GitHub 저장소를 Netlify의 **Import an existing project**로 연결합니다.
2. 배포 설정을 아래와 같이 입력합니다.

   | 항목 | 설정값 |
   | --- | --- |
   | Production branch | `main` |
   | Base directory | 비워 둠 |
   | Build command | 비워 둠 |
   | Publish directory | `.` |
   | Functions directory | `netlify/functions` |

   이 앱은 HTML, CSS, JavaScript 정적 파일을 그대로 배포하므로 Build command가 필요하지 않습니다. 저장소의 `netlify.toml`에도 같은 설정이 들어 있습니다.

3. Netlify 사이트 화면에서 **Project configuration → Environment variables**로 이동합니다.
4. **Add a variable**을 눌러 Key에 `OPENAI_API_KEY`, Value에 실제 OpenAI API 키를 입력합니다. 저장소, `script.js`, `netlify.toml`에는 키를 적지 마세요.
5. 범위(scope)를 선택할 수 있는 요금제라면 **Functions**를 포함합니다. 배포 문맥은 최소 **Production**에 값을 설정합니다.
6. 선택적으로 `OPENAI_IMAGE_MODEL`을 추가하고 값으로 `gpt-image-2`를 입력합니다. 생략해도 함수의 기본값은 `gpt-image-2`입니다.
7. 환경 변수를 추가하거나 변경한 뒤에는 **Deploys → Trigger deploy → Deploy site**로 다시 배포해야 새 값이 적용됩니다.

함수 파일은 `netlify/functions/transform-image.mjs`이고, 공통 OpenAI 호출 코드는 `netlify/functions/lib/openai-image.mjs`입니다. `netlify.toml`의 리다이렉트가 `/api/transform`을 `/.netlify/functions/transform-image`로 연결합니다.

배포가 끝나면 Netlify가 제공한 다음 형식의 운영 주소에서 앱을 여세요.

`https://YOUR-NETLIFY-SITE-NAME.netlify.app/`

이 주소에서 카메라 촬영을 완료한 뒤 결과 생성 상태에 **AI Paper Toon**이 표시되는지 확인합니다. API 주소는 `https://YOUR-NETLIFY-SITE-NAME.netlify.app/api/transform`이지만 POST 전용이므로 주소창에서 직접 여는 방식이 아니라 앱에서 촬영하여 테스트해야 합니다.

AI 변환이 실패하면 결과는 자동으로 **브라우저 Paper Toon** fallback으로 생성됩니다. 이때 Netlify의 **Logs → Functions → transform-image** 로그에서 API 키, 결제 한도, 모델 접근 권한 또는 요청 오류를 확인할 수 있습니다.

## GitHub Pages 배포

이 저장소의 `main` 브랜치에 파일을 올리면 GitHub Actions가 자동으로 배포합니다.

처음 한 번 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택해 주세요.

배포 주소 형식은 다음과 같습니다.

`https://GITHUB-USERNAME.github.io/camera-toon/`

현재 주소 `https://space-youthcenter.github.io/camera-toon/`에서는 OpenAI AI 변환이 작동하지 않습니다. 이 주소는 카메라 권한, 화면 방향 전환, 촬영, 저장 및 브라우저 fallback 테스트용으로 계속 사용할 수 있습니다. AI 변환 여부는 반드시 Netlify의 `*.netlify.app` 주소에서 확인하세요.

## 실제 카메라 프레임 사용

투명 PNG 프레임을 `assets/frame-camera.png`에 넣으세요. 화면 구멍의 위치가 다르면 `script.js`의 `getScreenRect()` 비율을 조정하면 됩니다.
