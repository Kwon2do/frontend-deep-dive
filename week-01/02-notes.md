# Macro Task queue와 Micro Task queue

자바스크립트는 **싱글 이벤트 루프 스레드 / 논블로킹 방식**으로 동작한다.

콜 스택에 수행할 작업을 할당하고, 스레드는 작업을 수행하게되는데 만약 setInterval, setTimeout과 같은 비동기 작업을 만나면 콜 스택에서 제외하고 태스크 큐로 보낸 후 다음 콜 스택에 남아있는 작업들을 다 수행하고나서야 태스크 큐로 보내놨던 작업들을 하나씩 꺼내서 수행 완료한다.

이때, 태스크 큐에는 **매크로 큐**와 **마이크로 큐**가 있는데

매크로 큐에는 setInterval, setTimeout과 같은 비동기 작업이 들어가고
마이크로 큐에는 Promise와 같은 비동기 작업이 들어간다.

이때, 마이크로 큐는 매크로 큐보다 우선순위가 높아서 같은 태스크 큐지만 마이크로 큐에 있는 작업들이 우선으로 수행된다.

아래 예시를 한번 보겠다.

```javascript

<!DOCTYPE html>
<html lang="ko">
  <head>
    <title>이벤트루프</title>
    <script>
      function onClickLoop() {
        console.log("=======시작!!!!=======");

        function aaa() {
          console.log("aaa-시작");
          bbb();
          console.log("aaa-끝");
        }

        async function bbb() {
          console.log("bbb-시작");
          await ccc(); // 힌트: ccc()가 먼저 실행되고 await가 진행됩니다.
          console.log("bbb-끝");
        }

        async function ccc() {
          console.log("ccc-시작");
          const friend = await "철수";
          console.log(friend);
        }

        aaa();

        console.log("=======끝!!!!=======");
      }
    </script>
  </head>
  <body>
    <button onclick="onClickLoop()">시작하기</button>
  </body>
</html>
```

이벤트 루프가 동작하는 모습을 분석해보겠다.

1. 콜스택에 onClickLoop 함수가 들어가서 컨텍스트를 생성하고 실행한다.
2. console.log("시작")이 실행된다.
3. aaa 함수가 실행되고, aaa-시작이 콘솔에 출력된다.
4. bbb 함수가 실행된다.
5. bbb 함수의 작업이 콜스택에 담기고 순차적으로 실행하게된다. -> bbb-시작
6. ccc 함수의 작업이 콜스택에 담기고 순차적으로 실행하게된다. -> ccc-시작
7. 스레드는 ccc 함수에서 마주친 await 비동기 작업을 마이크로 큐로 보내버리고, 잠시 보류한 뒤 콜스택에 남아있는 다른 작업으로 넘어간다.
8. bbb 함수도 마찬가지로 마이크로 태스크 큐로 보내버린다.
9. aaa-끝 콘솔을 출력하면서 aaa 함수를 마친다.
10. =======끝!!!!======= 콘솔을 출력하면서 onClickLoop 함수를 마친다.
11. 마이크로 큐에 있는 작업들을 순차적으로 콜스택에 담고 실행한다. -> ccc부터 실행 -> 철수가 출력된다
12. bbb도 마저 수행 -> bbb-끝이 출력된다.

#### 전체 출력 결과

=======시작!!!!=======

aaa-시작

bbb-시작

ccc-시작

aaa-끝

=======끝!!!!=======

철수

bbb-끝

---

지금까지는 await 키워드가 그저 작업이 완료된 후 다음 작업으로 넘어가게하는 키워드라고 생각을 했다.

하지만, 콜스택과 태스크 큐 개념에 대해서 공부하고 자바스크립트 싱글 스레드가 일하는 방식을 알게 되니까
await이 붙은 promise는 비동기 작업이기에 마이크로 큐로 이동하게 되고, 그에 따라 이를 감싸고 있는 함수도 마이크로 큐로 이동하게 된다.

큐 자료구조 특성상 FIFO이기 때문에, await이 붙은 promise는 비동기 작업이 먼저 큐에 들어가서 수행되고 그 뒤에 이동하게 된 이를 감싸고 있는 함수도 뒤이어 수행하게 되는 것이다.

이래서, await을 수행하고 그 다음 작업들을 수행하는 것처럼 보였던 것임!

---
