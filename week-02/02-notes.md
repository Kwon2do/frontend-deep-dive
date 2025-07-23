# Apollo-client 쿼리 및 refreshToken 사용

## Apollo-client 쿼리

Apollo-client는 쿼리(query)를 통해 백엔드 API를 호출할 수 있도록 도와주는 라이브러리이다.

apollo-client에는 크게 세가지의 쿼리 방식이 있다.

- **useQuery** : **페이지에 접속**하면 자동으로 **바로 실행**되어 **data라는 변수에 fetch해온 데이터를 담아주며**, 리렌더링 됨.

- **useLazyQuery** : **useQuery를 원하는 시점에 실행(버튼 클릭시)** 후 fetch해온 데이터를 **data변수에 담아**줌.

- **useApolloClient** : **원하는 시점에 실행** 후 fetch해온 데이터를 **원하는 변수에 담을** 수 있습니다. 따라서 axios 같은 느낌으로 사용이 가능하다.

위에 따라, 나는 useApolloClient()를 이용해 버튼을 눌렀을 때 fetchUserLoggedIn을 받아와보도록 만들어주었다.

```jsx
import { gql, useApolloClient, useLazyQuery, useQuery } from "@apollo/client";
import { IQuery } from "../../src/commons/types/generated/types";

const FETCH_USER_LOGGED_IN = gql`
  query fetchUserLoggedIn {
    fetchUserLoggedIn {
      email
      name
    }
  }
`;

export default function LoginSuccessPage() {
  // 1. 페이지 접속하면 자동으로 data에 받아지고, 리렌더링됨
  // const { data } = useQuery<Pick<IQuery, "fetchUserLoggedIn">>(FETCH_USER_LOGGED_IN);

  // 2. 버튼 클릭시 직접 실행하면 data에 받아지고, 리렌더링됨
  // const [myquery, { data }] = useLazyQuery(FETCH_USER_LOGGED_IN);

  // 3. axios와 동일
  // const client = useApolloClient();

  const client = useApolloClient();

  const onClickButton = async () => {
    const result = await client.query({
      query: FETCH_USER_LOGGED_IN,
    });
    console.log(result);
  };

  return <button onClick={onClickButton}>클릭하세요</button>;
}
```

이렇게 만들어 둔 뒤 Network탭을 보면 페이지에 접속했을때는 요청을 보내지 않다가 버튼을 클릭했을 때 요청을 보내게 된다.
이렇게 useApolloClient를 이용하시면 axios와 같은 방식으로 사용이 가능하다.

---

## refreshToken 실습

앞서 챕터01에서 학습한 내용을 토대로 refreshToken을 활용한 인가 검증을 구현해보겠다.

플로우는 아래와 같다.

1. 사용자가 서비스 내에서 API를 호출했지만 AccessToken이 만료된 상태임

2. 서버에서 AccessToken 만료를 감지 후, 쿠키에 저장되어있던 RefreshToken을 확인하고 새로운 액세스 토큰을 발급

3. 프론트 측에서는 기존 액세스 토큰을 삭제하고 새로운 액세스 토큰을 저장(덮어씌기)

4. 실패한 요청의 정보를 저장하고, 해당 정보를 바탕으로 재요청을 자동으로 수행

refreshToken을 받아오기 위해서는 accessToken이 만료되어야 한다.

이에 따라, `loginUserExample`은 임의로 토큰 만료시간을 짧게 설정해둔 API이다.

---

### 1. apollo 파일세팅 및 준비

리프레시 토큰을 받아오는 작업은 아폴로세팅을 해주는 부분에서 진행할 것이다.

```jsx
// src/apollo/index.tsx 파일

export default function ApolloSetting(props: IApolloSettingProps) {
  const [accessToken, setAccessToken] = useRecoilState(accessTokenState);
  const [userInfo, setUserInfo] = useRecoilState(userInfoState);
	if (!accessToken || !userInfo) return;
	    setUserInfo(JSON.parse(userInfo));
	  }, []);

	const errorLink = onError(({ graphQLErrors, operation, forward })=>{
		// 1-1. 에러를 캐치

		// 1-2. 해당에러가 토큰만료 에러인지 체크(UNAUTHENTICATED)

    // 2-1. refreshToken으로 accessToken을 재발급 받기

		// 2-2. 재발급 받은 accessToken 저장하기

		// 3-1. 재발급 받은 accessToken으로 방금 실패한 쿼리정보 수정하기

		// 3-2. 재발급 받은 accessToken으로 방금 수정한 쿼리 재요청하기

	})

	  const uploadLink = createUploadLink({
	    uri: "http://backend08.codebootcamp.co.kr/graphql",
	    headers: { Authorization: `Bearer ${accessToken}` },
		  credentials: "include",
	  });

	  const client = new ApolloClient({
	    link: ApolloLink.from([uploadLink]),
	    cache: APOLLO_CACHE,
	    connectToDevTools: true,
	  });


	  return (
	    <ApolloProvider client={client}>
	        {props.children}
	    </ApolloProvider>
	  )
	}
```

Apollo-client에서 제공하는 **`onError`** 라는 기능을 사용할 것이다.

요청을 보낼때,
**민감한 정보 포함을 승인**한다는 뜻의 **`credentials: “include”`** 옵션을 추가해야 한다.

만일, **`credentials: “include”` 이 없다면 refreshToken을 쿠키에 못담을 뿐만아니라 쿠키에 담겨있는것들도 백엔드로 전송이 되지 않는다.**

⚠️ **`알아둘 것!`**

- **graphQLErrors** : 에러들을 캐치해줍니다.
- **operation** : 방금전에 실패했던 쿼리가 뭐였는지 알아둡니다.
- **forward** : 실패했던 쿼리들을 재전송 합니다.

### 2. errorLink 생성 및 구조 기반 설정

위의 세팅이 끝났다면, 본격적으로 **errorLink**를 채워나가 보겠다.

```jsx
// src/apollo/index.tsx 파일의 errorLink부분

import { onError } from "@apollo/client/link/error";

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  // 1. 에러를 캐치
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // 2. 해당 에러가 토큰 만료 에러인지 체크(UNAUTHENTICATED)
      if (err.extensions.code === "UNAUTHENTICATED") {
        // 3. refreshToken으로 accessToken을 재발급 받기
      }
    }
  }
});
```

그런데,
여기서 한 가지 문제가 발생한다.

refreshToken을 사용하기 위해서는 graphQL 요청을 보내야 하는데,

**errorLink를 생성하는 코드는 ApolloProvider 바깥**에 있기 때문에

**useQuery나 useApolloClient등을 이용해 graphQL 요청을 보낼 수가 없게되는 것이다.**

이러한 문제를 해결하기 위해서 **`graphql-request`** 라는 라이브러리를 사용하면 된다.

---

### 3. 최종코드

```jsx
// src/apollo/index.tsx 파일
import { GraphQLClient } from "graphql-request";

export default function ApolloSetting(props: IApolloSettingProps) {
  const [accessToken, setAccessToken] = useRecoilState(accessTokenState);
  const [userInfo, setUserInfo] = useRecoilState(userInfoState);
	const RESTORE_ACCESS_TOKEN = gql`
	  mutation restoreAccessToken {
	    restoreAccessToken {
	      accessToken
	    }
	  }
	`;

	if (!accessToken || !userInfo) return;
	    setUserInfo(JSON.parse(userInfo));
	  }, []);

// 리프레시 토큰 만료 에러 캐치 & 발급
		const errorLink = onError(({ graphQLErrors, operation, forward })=>{
		// 1-1. 에러를 캐치
		if(graphQLErrors){
			for(const err of graphQLErrors){
				// 1-2. 해당 에러가 토큰만료 에러인지 체크(UNAUTHENTICATED)
				 if (err.extensions.code === "UNAUTHENTICATED") {

         // 2-1. refreshToken으로 accessToken을 재발급 받기
					const graphqlClient = new GraphQLClient(
          "https://backend-practice.codebootcamp.co.kr/graphql",
          { credentials: "include" }
	        );
					const result = await graphqlClient.request(RESTORE_ACCESS_TOKEN);
		      // RESTORE_ACCESS_TOKEM이라는 gql을 요청한 뒤 반환되는 결과값을 result에 담는다.
	        const newAccessToken = result.restoreAccessToken.accessToken;
	        // 2-2. 재발급 받은 accessToken 저장하기
	        setAccessToken(newAccessToken);

					//3-1. 재발급 받은 accessToken으로 방금 실패한 쿼리정보 수정하기
					if(typeof newAcessToken !== "string") return
					operation.setContext({
	                headers: {
	                  ...operation.getContext().headers,
	                  Authorization: `Bearer ${newAccessToken}`, // accessToken만 새걸로 바꿔치기
	                },
	              });
					//3-2. 재발급 받은 accessToken으로 방금 수정한 쿼리 재요청하기
					forward(operation)
        }
			}
		}
	})

	 const uploadLink = createUploadLink({
	    uri: "http://backend08.codebootcamp.co.kr/graphql",
	    headers: { Authorization: `Bearer ${accessToken}` },
		  credentials: "include",
	  });

	  const client = new ApolloClient({
	    link: ApolloLink.from([uploadLink]),
	    cache: APOLLO_CACHE,
	    connectToDevTools: true,
	  });

	  return (
	    <ApolloProvider client={client}>
	        {props.children}
	    </ApolloProvider>
	  )
	}
```

### 4. getAccessToken파일 분리

```jsx
// getAccessToken.ts 내용

import { gql } from "@apollo/client";
import { GraphQLClient } from "graphql-request";

const RESTORE_ACCESS_TOKEN = gql`
  mutation restoreAccessToken {
    restoreAccessToken {
      accessToken
    }
  }
`;

export async function getAccessToken() {
  try {
    const graphqlClient = new GraphQLClient(
      "https://backend-practice.codebootcamp.co.kr/graphql",
      {
        credentials: "include",
      }
    );
    const result = await graphqlClient.request(RESTORE_ACCESS_TOKEN);
    const newAccessToken = result.restoreAccessToken.accessToken;

    return newAccessToken;
  } catch (error) {
    console.log(error.message);
  }
}
```

이렇게 코드를 분리하고 나면, errorLink내부의 로직도 살짝 바뀌어야 한다.

**분리한 함수를 import 해주시고**, 함수의 return 값이 promise 이므로 .then을 이용해 이후의 코드를 작성할 수 있다.

```jsx
// src/apollo/index.tsx 파일
import getAccessToken from '파일 경로'

export default function ApolloSetting(props: IApolloSettingProps) {
  const [accessToken, setAccessToken] = useRecoilState(accessTokenState);
  const [userInfo, setUserInfo] = useRecoilState(userInfoState);
	const RESTORE_ACCESS_TOKEN = gql`
	  mutation restoreAccessToken {
	    restoreAccessToken {
	      accessToken
	    }
	  }
	`;

	if (!accessToken || !userInfo) return;
	    setUserInfo(JSON.parse(userInfo));
	  }, []);

// 리프레시 토큰 만료 에러 캐치 & 발급
	const errorLink = onError(({ graphQLErrors, operation, forward }) => {
	    // 1-1. 에러를 캐치
	    if (graphQLErrors) {
	      console.log(graphQLErrors);
	      for (const err of graphQLErrors) {
	        // 1-2. 해당 에러가 토큰만료 에러인지 체크(UNAUTHENTICATED)
	        if (err.extensions.code === "UNAUTHENTICATED") {

	          // 2-1. refreshToken으로 accessToken을 재발급 받기
	          return fromPromise(
	            getAccessToken().then((newAccessToken) => {
	              // 2-2. 재발급 받은 accessToken 저장하기
	              setAccessToken(newAccessToken);

	              // 3-1. 재발급 받은 accessToken으로 방금 실패한 쿼리 재요청하기
	              operation.setContext({
	                headers: {
	                  ...operation.getContext().headers,
	                  Authorization: `Bearer ${newAccessToken}`, // accessToken만 새걸로 바꿔치기
	                },
	              });
	            })
	          ).flatMap(() => forward(operation)); // 3-2. 변경된 operation 재요청하기!!!
	        }
	      }
	    }
	  });

	 const uploadLink = createUploadLink({
	    uri: "http://backend08.codebootcamp.co.kr/graphql",
	    headers: { Authorization: `Bearer ${accessToken}` },
		  credentials: "include",
	  });

	  const client = new ApolloClient({
	    link: ApolloLink.from([uploadLink]),
	    cache: APOLLO_CACHE,
	    connectToDevTools: true,
	  });

	  return (
	    <ApolloProvider client={client}>
	        {props.children}
	    </ApolloProvider>
	  )
	}
```

#### 5. 마무리 및 실습

1~4단계를 진행하면
refreshToken을 이용해 accessToken을 재발급 받을 준비가 다 되었다.

##### 실습결과

1. 먼저 로그인 요청을 보냄

2. 그리고 로그인 요청으로 발급 받은 AccessToken의 만료 기한이 지난 뒤, 뒤로 가기 버튼을 이용해 로그인 페이지로 나갔다가 다시 로그인 성공 페이지로 돌아온다.

3. 네트워크 탭에서 API 요청 순서를 확인해본다

토큰 만료로 API 요청 실패 > restoreToken 요청 > AccessToken 재발급 받은 뒤 API 재요청 순으로 작업이 실행된 것을 네트워크 탭에서 확인할 수 있다.
