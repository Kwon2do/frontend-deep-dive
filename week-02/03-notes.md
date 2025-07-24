# 새로고침시 토큰 유지하는 방법 (feat. Recoil Selector)

## 토큰을 넣어두는 Global State - recoil state

```jsx
// 3. 프리렌더링 무시 - useEffect 방법

// 토큰을 넣어두는 global state - recoilState
const [accessToken, setAccessToken] = useRecoilState(accessTokenState);

useEffect(() => {
  // 1. 기존방식(refreshToken 이전)
  // console.log("지금은 브라우저다!!!!!");
  // const result = localStorage.getItem("accessToken");
  // console.log(result);
  // if (result) setAccessToken(result);

  // 2. 새로운방식(refreshToken 이후) - 새로고침 이후에도 토큰 유지할 수 있도록
  void getAccessToken().then((newAccessToken) => {
    setAccessToken(newAccessToken);
  });
}, []);
```

근데 이렇게되면 모든 페이지에서 액세스 토큰을 받아오는 요청을 보내게 되어버림.

이를 해결하기 위해 **Recoil selector**(글로벌 함수)를 사용할 수 있다.

```jsx
const restoreAccessTokenLoadable = selector({
  key: "restoreAccessTokenLoadable",
  get: async () => {
    const newAccessToken = await getAccessToken();
    return newAccessToken;
  },
});
```

이렇게 만들어주고,
페이지에서

```jsx
const aaa = useRecoilValueLoadable(restoreAccessTokenLoadable);

useEffect(() => {
  void aaa.toPromise().then((newAccessToken) => {
    setAccessToken(newAccessToken ?? "");
  });
});
```

> **`toPromise()`의 역할**
>
> toPromise() 메서드는 이 Loadable 객체를 **Promise로 변환**하여, .then()으로 해당 **비동기 작업이 완료된 후 결과를 처리**할 수 있게 합니다.

---

# Promise와 Observable

### promise(프로미스)?

**비동기 작업을 도와주는 도구**이다.

### observable(옵저버블) 이란?

**`연속적인` 비동기 작업 도와주는 도구**이다.

- 연속적인 비동기 작업이란?
  - 요청을 빠르게 여러번 보내는 것을 말함.

#### 📚 observable 사용예시

=> 연속적인 페이지 클릭 혹은 연속적인 검색어 변경

게시글 목록페이지에서 페이지 요청을 여러번 빠르게 했을경우,
백엔드에서 누른 순서대로 응답을 보내지 않는다.

예를 들어,
3번페이지를 요청했다가 빠르게 5번 페이지를 요청했을 경우 3번 페이지 요청을 취소 후 5번 페이지를 보내줘야 하는데 , 백엔드에서는 3번페이지를 보여주게 됩니다.
이런경우에는 3번 페이지 요청을 취소해야 한다.
그렇지 않으면 사용자의 불편한 경험을 초해 할 수 있기 때문이다.

하지만, 이런경우는 promise로 처리 하는게 쉽지 않은데, 이럴 때 **`observable`**을 사용하게 된다.

## apollo-client의 flatmap

```jsx
import { from } from "zen-observable";

export default function () {
  const onClickButton = () => {
    // new promise(()=>{})
    // new observable(()=>{})

    // from을 hover해보시면 observable이 나옵니다.
    from(["", "", ""]) // fromPromise
      .flatMap((el) => from([`${el} 결과에 qqq 적용`, `${el} 결과에 zzz 적용`]))
      .subscribe((el) => console.log(el));
  };

  return <button onClick={onClickButton}> 클릭! </button>;
}
```

> **💡 fromPromise란?**
>
> onError 라는 함수는 return타입으로 Observable타입을 받고 있음.
>
> 하지만, 우리가 리턴해주는 값은 promise이기 때문에 Observable타입으로 바꿔줄 도구가 필요하다.
>
> 해당 도구 역시 아폴로에서 지원해주고 있으며, 그 도구가 바로 **fromPromise** 인 것 이다.
>
> 정리 하자면, fromPromise 는 promise타입을 Observable타입으로 바꿔주는 도구 이다.
> 즉, from과 비슷하다고 보면 된다.
