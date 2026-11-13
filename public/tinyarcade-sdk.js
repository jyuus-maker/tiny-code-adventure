/*
 * TinyArcade SDK v1
 * 받는 곳: https://tinyarcade-two.vercel.app/sdk/tinyarcade-sdk.js
 *
 * 사용법 (게임 레포에 이 파일을 복사해서 넣는다)
 *   <script src="tinyarcade-sdk.js"></script>
 *   <script>
 *     // 한 판 시작
 *     const s = await TinyArcade.start()          // { sessionId, testMode, loggedIn }
 *     if (!s.loggedIn) 화면에 "로그인하면 점수가 기록됩니다" 안내
 *     // 한 판 끝
 *     try {
 *       const r = await TinyArcade.submitScore(850) // { score, verifyStatus, testMode }
 *       // r.verifyStatus: 'NORMAL' 또는 'PENDING'(검증 중), 미리보기(testMode)면 null
 *     } catch (e) {
 *       // e = { code, message } → e.message를 화면에 보여 주면 된다
 *     }
 *   </script>
 *
 * 규칙
 * - 점수는 높을수록 좋은 숫자로 낸다. 0 이상, 소수 둘째 자리까지. (시간 단축형은 "기준값 - 기록"처럼 바꿔서)
 * - start() 1번 = submitScore() 1번. 다시 하려면 다시 start().
 * - 게임은 sandbox 안에서 실행되므로 localStorage·쿠키를 쓸 수 없다.
 * - 플랫폼 밖(새 탭)에서 직접 열면 비로그인처럼 동작한다: start()는 loggedIn:false, submitScore()는 UNAUTHORIZED.
 *
 * 메시지 계약 (03_12 §3-1, 03_13): 이미 정한 type·칸은 바꾸지 않고 추가만 한다.
 */
(function () {
  'use strict'

  var TIMEOUT_MS = 10000
  var inPlatform = window.parent !== window // iframe 안에서 실행 중인가
  var sessionId = null // start()로 받은 세션 번호. submitScore()에 붙여 보낸다
  var pending = null // 답장을 기다리는 요청 { expect, resolve, reject, timer }

  function fail(code, message) {
    return { code: code, message: message }
  }

  // 부모 창(플랫폼)이 보낸 답장만 받는다
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !pending) return
    var msg = e.data
    if (!msg || typeof msg !== 'object') return

    var p = pending
    if (msg.type === 'TINYARCADE_ERROR') {
      pending = null
      clearTimeout(p.timer)
      p.reject(fail(msg.code, msg.message))
    } else if (msg.type === p.expect) {
      pending = null
      clearTimeout(p.timer)
      p.resolve(msg)
    }
  })

  // 플랫폼에 메시지를 보내고, expect 타입의 답장을 기다린다
  function request(message, expect) {
    return new Promise(function (resolve, reject) {
      if (pending) {
        // 앞 요청이 끝나기 전에 또 부르면 앞 요청은 취소한다 (마지막 요청만 기다림)
        clearTimeout(pending.timer)
        pending.reject(fail('CANCELED', '새 요청으로 이전 요청이 취소되었습니다.'))
      }
      var timer = setTimeout(function () {
        pending = null
        reject(fail('TIMEOUT', '플랫폼 응답이 없습니다. 잠시 후 다시 시도해 주세요.'))
      }, TIMEOUT_MS)
      pending = { expect: expect, resolve: resolve, reject: reject, timer: timer }
      window.parent.postMessage(message, '*')
    })
  }

  function start() {
    if (!inPlatform) {
      sessionId = null
      return Promise.resolve({ sessionId: null, testMode: false, loggedIn: false })
    }
    return request({ type: 'TINYARCADE_START' }, 'TINYARCADE_STARTED').then(function (msg) {
      sessionId = msg.sessionId
      return { sessionId: msg.sessionId, testMode: msg.testMode, loggedIn: msg.loggedIn }
    })
  }

  function submitScore(score) {
    if (!inPlatform) {
      return Promise.reject(fail('UNAUTHORIZED', '플랫폼 밖에서는 점수가 기록되지 않습니다.'))
    }
    return request({ type: 'TINYARCADE_SUBMIT', sessionId: sessionId, score: score }, 'TINYARCADE_SUBMITTED')
      .then(function (msg) {
        sessionId = null
        return { score: msg.score, verifyStatus: msg.verifyStatus, testMode: msg.testMode }
      })
  }

  window.TinyArcade = { version: '1', start: start, submitScore: submitScore }
})()
